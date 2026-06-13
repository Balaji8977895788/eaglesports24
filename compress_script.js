const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const supabaseUrl = 'https://pwkjpdgnylmyfivmppyb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3a2pwZGdueWxteWZpdm1wcHliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDgyNDY4NSwiZXhwIjoyMDk2NDAwNjg1fQ.ovntI7sbMUvXTE9q_1qrr2f7aHfAl6ZuG_q5LZjE72E';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: jerseys, error } = await supabase.from('jerseys').select('*').like('category', '%Collection 1%');
    if (error) {
        console.error('Error fetching jerseys:', error);
        return;
    }
    
    for (const jersey of jerseys) {
        console.log(`Processing jersey ${jersey.id}: ${jersey.name}`);
        try {
            // Fetch image buffer
            const response = await fetch(jersey.image);
            if (!response.ok) {
                console.error(`Failed to fetch ${jersey.image}: ${response.statusText}`);
                continue;
            }
            const buffer = await response.buffer();
            
            // Compress using sharp to WebP
            const compressedBuffer = await sharp(buffer)
                .resize({ width: 1200, withoutEnlargement: true }) // Same as frontend logic
                .webp({ quality: 75 })
                .toBuffer();
                
            console.log(`Compressed from ${(buffer.length/1024).toFixed(1)}KB to ${(compressedBuffer.length/1024).toFixed(1)}KB`);
            
            if (compressedBuffer.length >= buffer.length) {
                console.log(`Skipping upload, compressed size is not smaller.`);
                continue;
            }
            
            // Upload to Supabase Storage
            // Get original file name from URL
            const urlParts = jersey.image.split('/');
            const originalFileName = urlParts[urlParts.length - 1];
            // Remove extension and add .webp
            const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.')) || originalFileName;
            const newFileName = `${baseName}.webp`;
            
            console.log(`Uploading ${newFileName}...`);
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('jerseys')
                .upload(newFileName, compressedBuffer, {
                    contentType: 'image/webp',
                    upsert: true
                });
                
            if (uploadError) {
                console.error(`Upload error:`, uploadError);
                continue;
            }
            
            // Get new public URL
            const { data: { publicUrl } } = supabase.storage
                .from('jerseys')
                .getPublicUrl(newFileName);
                
            // Update database
            const { error: updateError } = await supabase
                .from('jerseys')
                .update({ image: publicUrl })
                .eq('id', jersey.id);
                
            if (updateError) {
                console.error(`Update error:`, updateError);
            } else {
                console.log(`Successfully updated jersey ${jersey.id} with new URL`);
                
                // Optional: Delete old image if it has a different name
                if (originalFileName !== newFileName) {
                    await supabase.storage.from('jerseys').remove([originalFileName]);
                    console.log(`Deleted old image ${originalFileName}`);
                }
            }
            
        } catch (e) {
            console.error(`Error processing jersey ${jersey.id}:`, e);
        }
    }
    console.log('Done!');
}

run();
