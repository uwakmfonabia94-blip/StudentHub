// Function to fetch and display students
async function fetchStudents() {
    const grid = document.getElementById('student-grid');
    if (!grid) return; // Prevent errors if element is missing

    try {
        // 1. Get all profiles from Supabase
        const { data: profiles, error } = await _supabase
            .from('profiles')
            .select('*')
            .order('full_name', { ascending: true });

        if (error) throw error;

        grid.innerHTML = ''; // Clear the "Loading..." text

        if (!profiles || profiles.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:gray;">No students found.</p>';
            return;
        }

        profiles.forEach(student => {
            const card = document.createElement('div');
            card.className = 'auth-container';
            card.style.cssText = "margin: 0; padding: 15px; text-align: center;";
            
            const avatar = student.avatar_url 
                ? `<img src="${student.avatar_url}" style="width:70px; height:70px; border-radius:50%; object-fit:cover; border: 2px solid var(--primary);">`
                : `<i class="fas fa-user-circle" style="font-size:70px; color:#444;"></i>`;

            card.innerHTML = `
                ${avatar}
                <h4 style="margin:10px 0 5px 0; font-size: 0.9rem; color:white;">${student.full_name}</h4>
                <p style="font-size:0.7rem; color:var(--primary); margin:0;">${student.department}</p>
                <p style="font-size:0.6rem; color:gray; margin-bottom: 10px;">${student.level} Level</p>
                <button onclick="logView('${student.id}')" class="btn-primary" style="font-size:0.7rem; padding:8px 12px; width: auto;">View Profile</button>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        console.error("Directory Error:", err.message);
        grid.innerHTML = '<p style="color:red;">Failed to load students.</p>';
    }
}

// Function to handle clicks and notifications
async function logView(targetId) {
    try {
        const { data: { user } } = await _supabase.auth.getUser();

        if (user && user.id !== targetId) {
            // Log the view
            await _supabase.from('profile_views').insert([{ viewer_id: user.id, owner_id: targetId }]);

            // Create notification
            await _supabase.from('notifications').insert([{ 
                user_id: targetId, 
                title: "👀 Profile Viewed", 
                message: `${user.user_metadata.full_name || 'A student'} viewed your profile.`,
                type: 'view'
            }]);
        }
    } catch (err) {
        console.error("LogView Error:", err);
    } finally {
        // Always redirect, even if notification fails
        window.location.href = `user_profile.html?id=${targetId}`;
    }
}

// FIX: Ensure the DOM is ready before running
document.addEventListener('DOMContentLoaded', fetchStudents);