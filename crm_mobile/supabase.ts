import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngfgzqylxjjmzbuveecy.supabase.co';
const supabaseAnonKey = 'sb_publishable_FzFmsVAiM_tUBxWxKnjuRQ_p6wcdD4u';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
