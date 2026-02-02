// 1. Make sure the main function is marked as ASYNC
async function loadUserProfile() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const targetUserId = urlParams.get('id');

        if (!targetUserId) {
            window.location.href = 'directory.html';
            return;
        }

        // 2. Fetch Profile
        const { data: profile, error: profileErr } = await _supabase
            .from('profiles')
            .select('*')
            .eq('id', targetUserId)
            .single();

        if (profileErr || !profile) {
            showToast("User not found", "error");
            return;
        }

        // 3. Update Header
        document.getElementById('profile-header').innerHTML = `
            ${profile.avatar_url 
                ? `<img src="${profile.avatar_url}" style="width:120px; height:120px; border-radius:50%; object-fit:cover; border:3px solid var(--primary);">`
                : `<i class="fas fa-user-circle" style="font-size:120px; color:#444;"></i>`
            }
            <h1 style="margin-top:15px; font-size:1.5rem;">${profile.full_name}</h1>
            <p style="color:var(--primary); margin:5px 0;">${profile.department} • ${profile.level}</p>
        `;

        
     // 4. Fetch the resources this student has uploaded
        // We now know the column in your DB should be 'user_id' after the rename
        const { data: resources, error: resError } = await _supabase
            .from('documents')
            .select('*')
            .eq('user_id', targetUserId); 

        if (resError) {
            console.error("Database Fetch Error:", resError.message);
            return;
        }

        // 5. Render Resources
        const resourceList = document.getElementById('user-resources-list');
        resourceList.innerHTML = '';

        if (resources && resources.length > 0) {
            resources.forEach(res => {
                resourceList.innerHTML += `
                    <div class="auth-container" style="padding:15px; margin-bottom:10px; background:#1a1a1a; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <p style="margin:0; font-weight:bold;">${res.title || 'Untitled'}</p>
                            <small style="color:gray;">${res.course_code || 'Resource'}</small>
                        </div>
                        <a href="${res.file_url}" target="_blank" style="color:var(--primary);"><i class="fas fa-download"></i></a>
                    </div>
                `;
            });
        } else {
            resourceList.innerHTML = `<p style="color:gray; font-size:0.8rem; text-align:center; padding: 20px;">This student hasn't shared any resources yet.</p>`;
        }

        // Log the view
        logProfileView(targetUserId);

    } catch (err) {
        console.error("System Error:", err);
    }
}

async function logProfileView(targetId) {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user && user.id !== targetId) {
        await _supabase.from('profile_views').insert([{ viewer_id: user.id, owner_id: targetId }]);
    }
}

// Ensure the function is called properly
document.addEventListener('DOMContentLoaded', loadUserProfile);