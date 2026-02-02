// Helper: Show Toast Notification
function showToast(message, type = "success") {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    // Style adjustments based on type
    if (type === "error") toast.style.borderLeft = "5px solid #ff4444";
    
    toast.innerText = message;
    container.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Toggle Password Visibility
function togglePass(id) {
    const field = document.getElementById(id);
    const icon = field.nextElementSibling;
    if (field.type === "password") {
        field.type = "text";
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        field.type = "password";
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// Signup Logic
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('signup-btn');
        const spinner = document.getElementById('signup-spinner');
        
        btn.disabled = true;
        spinner.style.display = 'block';

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const fullName = document.getElementById('fullname').value;
        const dept = document.getElementById('dept').value;
        const level = document.getElementById('level').value;

// ... inside signup click listener ...
const { data, error } = await _supabase.auth.signUp({ email, password });

if (error) {
    showToast(error.message, "error");
} else if (data.user) {
    // IMPORTANT: Use the data.user.id immediately
    const { error: profileErr } = await _supabase
        .from('profiles')
        .insert([{ 
            id: data.user.id, 
            full_name: fullName, 
            department: dept, 
            level: level 
        }]);
    
    if (profileErr) {
        // If profile fails, the user exists in Auth but can't post.
        // We show a major error here.
        showToast("Account created, but profile setup failed. Please contact support.", "error");
        console.error(profileErr);
    } else {
        showToast("Account created! Redirecting...");
        setTimeout(() => window.location.href = "../dashboard/index.html", 1500);
    }
}
    });
}

// Login Logic
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('login-btn');
        const spinner = document.getElementById('login-spinner');
        
        btn.disabled = true;
        spinner.style.display = 'block';

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const { error } = await _supabase.auth.signInWithPassword({ email, password });

        if (error) {
            showToast(error.message, "error");
            btn.disabled = false;
            spinner.style.display = 'none';
        } else {
            showToast("Login successful!");
            setTimeout(() => {
                window.location.href = "../dashboard/index.html";
            }, 1000);
        }
    });
}