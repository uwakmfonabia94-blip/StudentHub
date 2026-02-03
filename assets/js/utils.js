function showToast(message, type = "success") {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === "error") toast.style.borderLeft = "5px solid #ff4444";
    
    toast.innerText = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Add this to utils.js or at the bottom of your pages
function setActiveNav() {
    const currentPath = window.location.pathname;
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        // Remove active class from all
        item.classList.remove('active');
        
        // If the link's href matches the current URL, add active
        if (currentPath.includes(item.getAttribute('href').replace('../', ''))) {
            item.classList.add('active');
        }
    });
}

// Run it on every page load
window.addEventListener('DOMContentLoaded', setActiveNav);

// Function to tell the database the user is active
async function updateHeartbeat() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return;

    await _supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);
}

// Update status every 30 seconds
setInterval(updateHeartbeat, 30000);
updateHeartbeat(); // Run once immediately on load

// 1. Check for notifications on load
async function initNotifications() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return;

    // Initial fetch of unread count
    updateNotifBadge(user.id);

    // REAL-TIME: Listen for new notifications
    _supabase
        .channel('schema-db-changes')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'notifications', 
            filter: `user_id=eq.${user.id}` 
        }, payload => {
            updateNotifBadge(user.id);
            showToast("New Notification: " + payload.new.title); // Uses your existing toast
        })
        .subscribe();
}

async function updateNotifBadge(userId) {
    // We use { count: 'exact', head: true } to get just the number, not the data
    const { count, error } = await _supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true }) 
        .eq('user_id', userId)
        .eq('is_read', false);

    if (error) {
        console.error("Badge Error:", error.message);
        return;
    }

    const badge = document.getElementById('notif-badge');
    if (badge) {
        if (count > 0) {
            badge.innerText = count > 9 ? "9+" : count;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }
}

async function toggleNotifications() {
    const panel = document.getElementById('notif-panel');
    const list = document.getElementById('notif-list');
    const { data: { user } } = await _supabase.auth.getUser();

    if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'block';
        
        // Add a loading state
        list.innerHTML = '<p style="padding: 20px; text-align: center; color: gray;">Loading...</p>';

        const { data: notifs, error } = await _supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        // FIX: Check if there was an error or if notifs is null
        if (error) {
            console.error("Supabase Error:", error.message);
            list.innerHTML = `<p style="padding: 20px; text-align: center; color: #ff4444;">Error loading alerts</p>`;
            return;
        }

        list.innerHTML = '';
        
        // FIX: Safely check if notifs exists and has items
        if (notifs && notifs.length > 0) {
            notifs.forEach(n => {
                list.innerHTML += `
                    <div style="padding: 12px; border-bottom: 1px solid #222; background: ${n.is_read ? 'transparent' : '#222'};">
                        <p style="margin:0; font-size: 0.85rem; color: white; font-weight: ${n.is_read ? 'normal' : 'bold'};">${n.title}</p>
                        <p style="margin:5px 0 0 0; font-size: 0.75rem; color: #888;">${n.message}</p>
                        <small style="font-size: 0.6rem; color: #555;">${new Date(n.created_at).toLocaleTimeString()}</small>
                    </div>
                `;
            });
        } else {
            list.innerHTML = `<p style="padding: 20px; text-align: center; color: gray;">All caught up!</p>`;
        }
    } else {
        panel.style.display = 'none';
    }
}
async function markAllRead() {
    const { data: { user } } = await _supabase.auth.getUser();
    await _supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id);
    
    updateNotifBadge(user.id);
    document.getElementById('notif-panel').style.display = 'none';
}

// Run on page load
initNotifications();

/**
 * PRO TIP: This function pre-loads images in the background 
 * so they appear instantly when the UI needs them.
 */
async function preloadProfileImages(urls) {
    const promises = urls.map(url => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = url;
            img.onload = resolve;
            img.onerror = resolve; // Continue even if one fails
        });
    });
    await Promise.all(promises);
}

// Example usage when fetching your "Active Students" list
async function loadActiveStudents() {
    // 1. Fetch your students from Supabase
    const { data: students, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .limit(10);

    if (students) {
        // 2. Start pre-loading their photos immediately
        const urls = students.map(s => s.avatar_url).filter(url => url);
        preloadProfileImages(urls);
        
        // 3. Render your UI (they will pop in much faster now)
        renderActiveStudents(students);
    }
}