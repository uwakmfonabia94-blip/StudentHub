/**
 * PeerPoint General Feed Logic
 * Fetches both resources and forum discussions for a unified experience.
 */

const feedContainer = document.getElementById('feed-container');

async function fetchGeneralFeed() {
    // 1. Show Skeleton Loaders initially
    feedContainer.innerHTML = `
        <div class="skeleton" style="height: 120px; margin-bottom: 15px;"></div>
        <div class="skeleton" style="height: 120px; margin-bottom: 15px;"></div>
        <div class="skeleton" style="height: 120px; margin-bottom: 15px;"></div>
    `;

    // 2. Fetch latest Documents (PDFs/Photos)
    const { data: docs, error: docError } = await _supabase
        .from('documents')
        .select(`*, profiles(full_name, department)`)
        .order('created_at', { ascending: false })
        .limit(10);

    // 3. Fetch latest Forum Posts
    const { data: posts, error: postError } = await _supabase
        .from('forum_posts')
        .select(`*, profiles(full_name, department)`)
        .order('created_at', { ascending: false })
        .limit(10);

    if (docError || postError) {
        console.error("Feed Error:", docError || postError);
        return;
    }

    // 4. Combine and Sort by Date
    const combinedFeed = [...(docs || []), ...(posts || [])].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
    );

    feedContainer.innerHTML = ''; // Clear skeletons

    if (combinedFeed.length === 0) {
        feedContainer.innerHTML = '<p style="text-align:center; color:gray; margin-top:50px;">Nothing to see yet. Be the first to post!</p>';
        return;
    }

    // 5. Render Feed Items
    combinedFeed.forEach(item => {
        const isDoc = item.file_url ? true : false;
        const card = document.createElement('div');
        card.className = 'auth-container';
        card.style.maxWidth = '100%';
        card.style.margin = '0 0 15px 0';
        card.style.padding = '15px';
        card.style.borderLeft = isDoc ? '4px solid var(--primary)' : '4px solid #333';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <span style="font-size: 0.7rem; color: var(--primary); font-weight: bold; text-transform: uppercase;">
                    ${isDoc ? '<i class="fa-solid fa-file-pdf"></i> Resource' : '<i class="fa-solid fa-comments"></i> Discussion'}
                </span>
                <span style="font-size: 0.65rem; color: #666;">${new Date(item.created_at).toLocaleDateString()}</span>
            </div>
            
            <h3 style="margin: 8px 0; font-size: 1.1rem;">${item.title}</h3>
            
            <p style="font-size: 0.85rem; color: #bbb; margin-bottom: 10px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${isDoc ? `Level: ${item.level} | Dept: ${item.department}` : item.content}
            </p>

            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.75rem; color: #777;">By ${item.profiles?.full_name || 'User'}</span>
                ${isDoc 
                    ? `<a href="${item.file_url}" target="_blank" class="btn-primary" style="width:auto; padding: 5px 12px; font-size: 0.8rem; text-decoration:none;">View PDF</a>`
                    : `<a href="../forum/thread.html?id=${item.id}" class="btn-primary" style="width:auto; padding: 5px 12px; font-size: 0.8rem; text-decoration:none; background: #333; color: white;">Join Chat</a>`
                }
            </div>
        `;
        feedContainer.appendChild(card);
    });
}

// Ensure User is Logged In
async function checkUser() {
    const { data } = await _supabase.auth.getSession();
    if (!data.session) {
        window.location.href = "../auth/login.html";
    } else {
        fetchGeneralFeed();
    }
}

checkUser();

async function loadActiveStudents() {
    const activeList = document.getElementById('active-students-list');
    
    // Fetch top 10 students seen in the last 24 hours
    const { data: students, error } = await _supabase
        .from('profiles')
        .select('id, full_name, avatar_url, last_seen')
        .order('last_seen', { ascending: false })
        .limit(10);

    if (error || !students) return;

    activeList.innerHTML = ''; // Remove skeletons

    students.forEach(student => {
        // Determine if they are "Online Now" (seen in last 2 minutes)
        const lastSeenDate = new Date(student.last_seen);
        const now = new Date();
        const isOnline = (now - lastSeenDate) < 120000; // 120,000ms = 2 mins

        const studentDiv = document.createElement('div');
        studentDiv.style.textAlign = 'center';
        studentDiv.style.flexShrink = '0';
        studentDiv.style.cursor = 'pointer';
        studentDiv.onclick = () => window.location.href = `directory.html?id=${student.id}`;

        studentDiv.innerHTML = `
            <div style="position: relative; width: 60px; height: 60px; margin: 0 auto;">
                ${student.avatar_url 
                    ? `<img src="${student.avatar_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; border: 2px solid ${isOnline ? '#00ff00' : '#444'};">`
                    : `<i class="fas fa-user-circle" style="font-size: 60px; color: #555;"></i>`
                }
                ${isOnline ? `
                    <span style="position: absolute; bottom: 2px; right: 2px; width: 12px; height: 12px; background: #00ff00; border: 2px solid var(--card-bg); border-radius: 50%;"></span>
                ` : ''}
            </div>
            <span style="display: block; font-size: 0.65rem; color: #ccc; margin-top: 5px; width: 60px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${student.full_name.split(' ')[0]}
            </span>
        `;
        activeList.appendChild(studentDiv);
    });
}

// Run this when the page loads
document.addEventListener('DOMContentLoaded', loadActiveStudents);

// Run once when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadActiveStudents();
    // Refresh the status every 60 seconds
    setInterval(loadActiveStudents, 60000);
});