import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://harbaqvqxwgkifkbejwy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhcmJhcXZxeHdna2lma2Jland5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NDgwMzYsImV4cCI6MjA5NjUyNDAzNn0.Jdk8rVPVfHcegQuRpFqwZWbdY-bmnhIH2qirvSRqreU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
