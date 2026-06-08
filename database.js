const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const supabaseUrl = process.env.SUPABASE_URL ? process.env.SUPABASE_URL.trim() : null;
const supabaseKey = process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.trim() : null;

let supabase;

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ WARNING: Missing Supabase URL or Key in environment variables. Database operations will fail.');
    // Create a mock proxy so the server doesn't crash on start
    supabase = new Proxy({}, {
        get() {
            return () => {
                throw new Error('Supabase client not initialized. Check your SUPABASE_URL and SUPABASE_KEY environment variables.');
            };
        }
    });
} else {
    supabase = createClient(supabaseUrl, supabaseKey, {
        realtime: {
            transport: WebSocket
        }
    });
}

module.exports = supabase;
