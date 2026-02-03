const avatarInput = document.getElementById('avatar-input');
const userAvatar = document.getElementById('user-avatar');
const defaultAvatar = document.getElementById('default-avatar');
const deletePhotoBtn = document.getElementById('delete-photo-btn');
const profileForm = document.getElementById('profile-form');

async function loadProfile() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return window.location.href = "login.html";

    const { data: profile, error } = await _supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) return console.error(error);

    // Fill UI
    document.getElementById('display-name').value = profile.full_name;
    document.getElementById('user-dept').innerText = profile.department;
    document.getElementById('user-level').innerText = profile.level;

    if (profile.avatar_url) {
        userAvatar.src = profile.avatar_url;
        userAvatar.style.display = 'block';
        defaultAvatar.style.display = 'none';
        deletePhotoBtn.style.display = 'inline-block';
    }
}

// 1. Update Profile Photo (Upload to Storage)
avatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const { data: { user } } = await _supabase.auth.getUser();
    const filePath = `avatars/${user.id}_${Date.now()}`;

    showToast("Uploading photo...");

    // Upload to 'pdfs' bucket (or create 'avatars' bucket)
    const { error: uploadError } = await _supabase.storage
        .from('pdfs')
        .upload(filePath, file);

    if (uploadError) return showToast(uploadError.message, "error");

    const { data: urlData } = _supabase.storage.from('pdfs').getPublicUrl(filePath);
    
    // Update Profile Record
    await _supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', user.id);
    
    location.reload(); // Refresh to show new photo
});

// 2. Delete Profile Photo
deletePhotoBtn.addEventListener('click', async () => {
    const { data: { user } } = await _supabase.auth.getUser();
    
    const { error } = await _supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

    if (!error) {
        showToast("Photo removed");
        location.reload();
    }
});

// 3. Update Name
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-btn');
    btn.disabled = true;

    const newName = document.getElementById('display-name').value;
    const { data: { user } } = await _supabase.auth.getUser();

    const { error } = await _supabase
        .from('profiles')
        .update({ full_name: newName })
        .eq('id', user.id);

    if (error) showToast(error.message, "error");
    else showToast("Profile updated!");

    btn.disabled = false;
});

async function handleLogout() {
    await _supabase.auth.signOut();
    window.location.href = "login.html";
}

loadProfile();