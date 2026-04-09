window.APP_CONFIG = {
    supabase: {
        // ⚠️ 아래 값을 Supabase Dashboard에서 복사하여 입력하세요
        // Dashboard → Settings → API → Project URL / anon public key
        url: 'https://egwmkpplnzypkbedasrs.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnd21rcHBsbnp5cGtiZWRhc3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MzIxODcsImV4cCI6MjA5MTIwODE4N30.u_ZOHeNMXg0QCpc23I54rcrPNMj80rPaMlpvzidG1bw'
    },
    plans: {
        free:     { plan: 'free_trial',    amount: 0 },
        '1month': { plan: 'monthly',       amount: 39000 },
        full:     { plan: 'full_package',  amount: 59000 }
    },
    kakao: {
        channelUrl: 'https://open.kakao.com/me/pluscoach'
    },
    site: {
        url: ''
    }
};
