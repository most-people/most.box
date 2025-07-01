import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vibeseycqiisftkweeat.supabase.co";
const supabaseKey = "sb_publishable_BN0UEj0bBXC9EOkeeHrK7w_TgPpB9_X";

export const supabase = createClient(supabaseUrl, supabaseKey);
