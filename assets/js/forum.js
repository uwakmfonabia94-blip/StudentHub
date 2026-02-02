const forumList = document.getElementById('forum-list');
const postForm = document.getElementById('forum-post-form');

async function fetchPosts() {
    const { data, error } = await _supabase
        .from('forum_posts')
        .select(`*, profiles(full_name, department)`)
        .order('created_at', { ascending: false });

    if (error) return console.error(error);

    forumList.innerHTML = '';
    data.forEach(post => {
        const card = document.createElement('div');
        card.className = 'auth-container';
        card.style.maxWidth = '100%';
        card.style.margin = '0 0 15px 0';
        card.style.cursor = 'pointer';
        card.onclick = () => window.location.href = `thread.html?id=${post.id}`;
        
        card.innerHTML = `
            <span style="background: var(--primary); color:black; font-size:0.7rem; padding:2px 8px; border-radius:10px; font-weight:bold;">
                ${post.category}
            </span>
            <h3 style="margin: 10px 0 5px 0;">${post.title}</h3>
            <p style="color: #aaa; font-size: 0.9rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${post.content}
            </p>
            <div style="margin-top: 10px; font-size: 0.75rem; color: #666;">
                By ${post.profiles?.full_name} • ${new Date(post.created_at).toLocaleDateString()}
            </div>
        `;
        forumList.appendChild(card);
    });
}

if (postForm) {
    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 1. Reference UI elements
        const btn = e.target.querySelector('button[type="submit"]');
        const spinner = document.getElementById('post-spinner');

        // 2. Immediate lockout to prevent double-clicks
        if (btn.disabled) return;
        btn.disabled = true;
        spinner.style.display = 'block';

        try {
            const { data: userData, error: authError } = await _supabase.auth.getUser();
            
            if (authError || !userData.user) {
                throw new Error("You must be logged in to post.");
            }

            // 3. Perform the Insert
            const { error } = await _supabase.from('forum_posts').insert([{
                title: document.getElementById('post-title').value.trim(),
                content: document.getElementById('post-content').value.trim(),
                category: document.getElementById('post-category').value,
                user_id: userData.user.id
            }]);

            if (error) throw error;

            // 4. Success handling
            showToast("Question posted!");
            document.getElementById('post-modal').style.display = 'none';
            postForm.reset();
            await fetchPosts(); // Wait for fetch to finish

        } catch (err) {
            // 5. Only show error and re-enable button if something went wrong
            showToast(err.message, "error");
            console.error("Post Error:", err);
            btn.disabled = false; // Let them try again
        } finally {
            // 6. Cleanup UI
            spinner.style.display = 'none';
        }
    });
}
fetchPosts();