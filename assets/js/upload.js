if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fileInput = document.getElementById('file-input');
        const file = fileInput.files[0];
        const title = document.getElementById('title').value;
        const isPastQuestion = document.getElementById('is_past_question').value === "true";
        const dept = document.getElementById('dept').value;
        const level = document.getElementById('level').value;

        if (!file) return showToast("Please select a file first", "error");

        // UI Loading
        btn.disabled = true;
        spinner.style.display = 'block';

        try {
            const { data: { user } } = await _supabase.auth.getUser();
            if (!user) throw new Error("Please log in.");

            // 1. Detect File Type
            const fileType = file.type.startsWith('image/') ? 'image' : 'pdf';
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            // 2. Upload to Storage
            const { error: uploadError } = await _supabase.storage
                .from('pdfs')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = _supabase.storage.from('pdfs').getPublicUrl(filePath);

            // 3. Save Metadata (Including file_type)
            const { data: docData, error: dbError } = await _supabase
                .from('documents')
                .insert([{
                    title: title,
                    file_url: urlData.publicUrl,
                    uploaded_by: user.id,
                    department: dept,
                    level: level,
                    is_past_question: isPastQuestion,
                    file_type: fileType // <--- Added this
                }]).select().single();

            if (dbError) throw dbError;

            // 4. TRIGGER NOTIFICATIONS for Coursemates
            await sendDepartmentNotification(dept, level, title, user.id, docData.id);

            showToast("Resource shared with your department!");
            uploadForm.reset();
            setTimeout(() => window.location.href = "index.html", 1500);

        } catch (err) {
            showToast(err.message, "error");
        } finally {
            btn.disabled = false;
            spinner.style.display = 'none';
        }
    });
}

/**
 * LOGIC: Find all students in same dept/level and add a notification for them
 */
async function sendDepartmentNotification(dept, level, title, senderId, docId) {
    // 1. Find all users in this department and level (except the sender)
    const { data: coursemates } = await _supabase
        .from('profiles')
        .select('id')
        .eq('department', dept)
        .eq('level', level)
        .neq('id', senderId);

    if (coursemates && coursemates.length > 0) {
        const notifications = coursemates.map(mate => ({
            user_id: mate.id,
            type: 'new_resource',
            message: `New ${level} ${dept} resource: ${title}`,
            related_id: docId,
            is_read: false
        }));

        // 2. Insert into notifications table
        await _supabase.from('notifications').insert(notifications);
    }
}