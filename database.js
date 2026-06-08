const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

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
    supabase = createClient(supabaseUrl, supabaseKey);
}

module.exports = supabase;
