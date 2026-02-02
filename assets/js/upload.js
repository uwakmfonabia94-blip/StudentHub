/**
 * PeerPoint Upload Logic
 * Handles file uploads to Supabase Storage and metadata to Database.
 */

const uploadForm = document.getElementById('upload-form');
const btn = document.getElementById('upload-btn');
const spinner = document.getElementById('upload-spinner');

// Helper: Show Toast Notification
function showToast(message, type = "success") {
    const container = document.getElementById('toast-container');
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

if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fileInput = document.getElementById('file-input');
        const file = fileInput.files[0];
        const title = document.getElementById('title').value;
        const isPastQuestion = document.getElementById('is_past_question').value === "true";
        const dept = document.getElementById('dept').value;
        const level = document.getElementById('level').value;

        if (!file) {
            showToast("Please select a file first", "error");
            return;
        }

        // 1. UI Loading State
        btn.disabled = true;
        spinner.style.display = 'block';

        try {
            // 2. Get Current User
            const { data: { user }, error: authError } = await _supabase.auth.getUser();
            if (authError || !user) throw new Error("Please log in to upload.");

            // 3. Upload File to Storage Bucket ('pdfs')
            // Using a timestamp + name to prevent filename collisions
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`; // Organized by User ID folder

            const { data: uploadData, error: uploadError } = await _supabase.storage
                .from('pdfs')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 4. Get the Public URL of the uploaded file
            const { data: urlData } = _supabase.storage
                .from('pdfs')
                .getPublicUrl(filePath);

            const fileUrl = urlData.publicUrl;

            // 5. Save Metadata to 'documents' table
            const { error: dbError } = await _supabase
                .from('documents')
                .insert([{
                    title: title,
                    file_url: fileUrl,
                    uploaded_by: user.id,
                    department: dept,
                    level: level,
                    is_past_question: isPastQuestion
                }]);

            if (dbError) throw dbError;

            // 6. Success!
            showToast("Resource shared successfully!");
            uploadForm.reset();
            
            // Redirect to feed after a short delay
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1500);

        } catch (err) {
            showToast(err.message, "error");
            console.error("Upload Error:", err);
        } finally {
            btn.disabled = false;
            spinner.style.display = 'none';
        }
    });
}

// Optional: Preview for Image Uploads
document.getElementById('file-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        showToast("Image selected for past question.");
    } else if (file && file.type === 'application/pdf') {
        showToast("PDF document selected.");
    }
});