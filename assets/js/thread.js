/**
 * PeerPoint Thread Logic
 * Handles viewing a single post and its replies.
 */

const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

const questionDetail = document.getElementById('question-detail');
const answersContainer = document.getElementById('answers-container');
const answerForm = document.getElementById('answer-form');

// Internal Toast Function to prevent ReferenceError
function showToast(message, type = "success") {
    const container = document.getElementById('toast-container');
    if (!container) {
        alert(message); // Fallback if container is missing
        return;
    }
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

async function loadThread() {
    if (!postId) {
        window.location.href = 'index.html';
        return;
    }

    // 1. Fetch Question details + User Profile details
    const { data: post, error } = await _supabase
        .from('forum_posts')
        .select('*, profiles(full_name, department, level)')
        .eq('id', postId)
        .single();

    if (error) {
        console.error("Error loading post:", error);
        questionDetail.innerHTML = `<p style="color:red;">Error loading discussion.</p>`;
        return;
    }

    questionDetail.innerHTML = `
        <div class="auth-container" style="max-width: 100%; margin: 0; border: 1px solid var(--primary);">
            <div style="font-size: 0.75rem; color: var(--primary); margin-bottom: 5px;">
                ${post.profiles?.department || 'General'} • ${post.profiles?.level || 'N/A'}
            </div>
            <h2 style="text-align: left; margin-bottom: 10px; color: var(--primary);">${post.title}</h2>
            <p style="white-space: pre-wrap; color: #eee; line-height:1.5;">${post.content}</p>
            <div style="margin-top: 15px; font-size: 0.8rem; color: var(--text-gray);">
                Asked by ${post.profiles?.full_name || 'Anonymous'}
            </div>
        </div>
    `;

    fetchAnswers();
}

async function fetchAnswers() {
    const { data: answers, error } = await _supabase
        .from('forum_answers')
        .select('*, profiles(full_name)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Error fetching answers:", error);
        return;
    }

    answersContainer.innerHTML = '';
    if (answers.length === 0) {
        answersContainer.innerHTML = '<p style="color:gray; text-align:center; padding: 20px;">No answers yet. Be the first to help!</p>';
        return;
    }

    answers.forEach(ans => {
        const div = document.createElement('div');
        div.className = 'auth-container';
        div.style.maxWidth = '100%';
        div.style.margin = '0 0 10px 0';
        div.style.padding = '12px';
        div.style.background = '#222';
        
        div.innerHTML = `
            <p style="margin-bottom: 5px; color: #fff;">${ans.content}</p>
            <small style="color: var(--primary); font-size: 0.7rem; font-weight: bold;">
                — ${ans.profiles?.full_name || 'Anonymous'}
            </small>
        `;
        answersContainer.appendChild(div);
    });
}

// Handle Submitting Answer
if (answerForm) {
    answerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const spinner = document.getElementById('answer-spinner');
        const input = document.getElementById('answer-input');

        if (btn.disabled) return;

        btn.disabled = true;
        if (spinner) spinner.style.display = 'inline-block';

        try {
            const { data: { user }, error: userError } = await _supabase.auth.getUser();

            if (userError || !user) {
                throw new Error("You must be logged in to answer.");
            }

            const { error: insertError } = await _supabase.from('forum_answers').insert([{
                post_id: postId,
                user_id: user.id,
                content: input.value.trim()
            }]);

            if (insertError) throw insertError;

            showToast("Answer posted!");
            input.value = '';
            fetchAnswers(); // Refresh list

        } catch (err) {
            showToast(err.message, "error");
        } finally {
            btn.disabled = false;
            if (spinner) spinner.style.display = 'none';
        }
    });
}

// Start the page
loadThread();