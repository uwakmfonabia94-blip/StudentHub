const resourceList = document.getElementById('resource-list');
const levelFilter = document.getElementById('filter-level');
const deptSearch = document.getElementById('search-dept');

async function fetchResources() {
    // Show Skeletons while loading
    resourceList.innerHTML = `
        <div class="skeleton" style="height: 100px; margin-bottom: 10px;"></div>
        <div class="skeleton" style="height: 100px; margin-bottom: 10px;"></div>
    `;

    let query = _supabase
        .from('documents')
        .select(`*, profiles(full_name)`)
        .order('created_at', { ascending: false });

    // Apply Filters if they exist
    if (levelFilter.value) {
        query = query.eq('level', levelFilter.value);
    }
    if (deptSearch.value) {
        query = query.ilike('department', `%${deptSearch.value}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error(error);
        return;
    }

    resourceList.innerHTML = '';

    if (data.length === 0) {
        resourceList.innerHTML = '<p style="text-align:center; color:gray;">No resources found.</p>';
        return;
    }

    data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'auth-container';
        div.style.maxWidth = '100%';
        div.style.margin = '0 0 15px 0';
        div.style.padding = '15px';
        
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <h3 style="color: var(--primary); margin:0;">${item.title}</h3>
                    <p style="font-size: 0.8rem; color: #aaa;">${item.department} | ${item.level}</p>
                    <p style="font-size: 0.7rem; color: #666;">Uploaded by ${item.profiles?.full_name || 'Anonymous'}</p>
                </div>
                <a href="${item.file_url}" target="_blank" class="btn-primary" style="width: auto; padding: 8px 12px;">
                    <i class="fa-solid fa-download"></i>
                </a>
            </div>
        `;
        resourceList.appendChild(div);
    });
}

// Event Listeners for Live Filtering
levelFilter.addEventListener('change', fetchResources);
deptSearch.addEventListener('input', fetchResources);

// Initial Load
fetchResources();