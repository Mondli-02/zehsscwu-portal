let currentAdmin = null;
let allInstitutions = [];
let allMembers = [];
let currentInstitutionForMembers = null;
let selectedMemberAdmin = null;
let selectedInstitution = null;
let addedMembers = [];

// These track searching state to modify download functionality
let currentInstitutionSearchResults = [];
let currentMemberSearchResults = [];
let currentAdminSearchResults = [];
let currentSearchType = null;

async function initializeAdminDashboard() {
    showLoading();

    try {
        // Check authentication
        const session = await checkAuth();
        if (!session) return;

        // Verify user is an admin
        const userRole = localStorage.getItem('userRole');
        if (userRole !== 'admin') {
            throw new Error('Access denied. Admin access required.');
        }

        // Load admin data and system stats
        await loadAdminData();
        await loadSystemStats();
        await loadAllInstitutions();
        await loadAllMembers();
        await loadMemberRequests();
        await determineNextMemberId();

        // Update welcome message
        document.getElementById('adminWelcome').textContent = `Welcome, Admin`;

        

        hideLoading();

    } catch (error) {
        hideLoading();
        showError(error.message);
        setTimeout(() => window.location.href = 'login.html', 2000);
    }
}

async function loadAdminData() {
    try {
        const userId = localStorage.getItem('userId');

        const { data: adminData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;

        currentAdmin = adminData;

    } catch (error) {
        throw new Error('Failed to load admin data: ' + error.message);
    }
}

async function loadSystemStats() {
    try {
        // Get total institutions
        const { count: institutionsCount, error: instError } = await supabase
            .from('institutions')
            .select('*', { count: 'exact', head: true });

        if (instError) throw instError;

        // Get total members
        const { count: membersCount, error: memError } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true });

        if (memError) throw memError;

        // Get works councils count (institutions that have works councils)
        const { count: worksCouncilsCount, error: wcError } = await supabase
            .from('works_councils')
            .select('institution_id', { count: 'exact', head: true });

        if (wcError) throw wcError;

        // Get works committees count (institutions that have works committees)
        const { count: worksCommitteesCount, error: wcomError } = await supabase
            .from('works_committees')
            .select('institution_id', { count: 'exact', head: true });

        if (wcomError) throw wcomError;

        // Update stats display
        document.getElementById('totalInstitutions').textContent = institutionsCount || 0;
        document.getElementById('totalMembers').textContent = membersCount || 0;
        document.getElementById('totalWorksCouncils').textContent = worksCouncilsCount || 0;
        document.getElementById('totalWorksCommittees').textContent = worksCommitteesCount || 0;

    } catch (error) {
        console.error('Error loading system stats:', error);
    }
}

async function loadAllInstitutions() {
    try {
        const { data: institutions, error } = await supabase
            .from('institutions')
            .select(`
                *,
                members (id)
            `)
            .order('institution_name');

        if (error) throw error;

        allInstitutions = institutions || [];
        displayInstitutionsTable(allInstitutions);

        // Populate institution select for works management
        populateInstitutionSelect();

    } catch (error) {
        console.error('Error loading institutions:', error);
        showError('Failed to load institutions');
    }
}

function populateInstitutionSelect() {
    // Populate works institution select
    const worksSelect = document.getElementById('worksInstitutionSelect');
    if (worksSelect) {
        worksSelect.innerHTML = '<option value="">Select Institution</option>';
        allInstitutions.forEach(institution => {
            const option = document.createElement('option');
            option.value = institution.id;
            option.textContent = `${institution.institution_name} (${institution.institution_id})`;
            worksSelect.appendChild(option);
        });
    }

    // ALSO populate the admin add member institution select
    const adminAddMemberSelect = document.getElementById('adminAddMemberInstitution');
    if (adminAddMemberSelect) {
        adminAddMemberSelect.innerHTML = '<option value="">Select Institution</option>';
        allInstitutions.forEach(institution => {
            const option = document.createElement('option');
            option.value = institution.id;
            option.textContent = `${institution.institution_name} (${institution.institution_id})`;
            adminAddMemberSelect.appendChild(option);
        });
    }
}

function searchInstitutionsForUpdate() {
    const searchTerm = document.getElementById('updateInstitutionSearch').value;
    const branchFilter = document.getElementById('updateInstitutionBranch').value;

    // Simple client-side filtering for now
    const filtered = allInstitutions.filter(inst => {
        const matchesName = !searchTerm ||
            inst.institution_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesBranch = !branchFilter || inst.branch === branchFilter;
        return matchesName && matchesBranch;
    });

    displayInstitutionUpdateResults(filtered);
}

function displayInstitutionUpdateResults(institutions) {
    const container = document.getElementById('institutionUpdateResults');

    if (institutions.length === 0) {
        container.innerHTML = '<p>No institutions found matching your criteria.</p>';
        return;
    }

    container.innerHTML = institutions.map(inst => `
        <div class="info-card" style="margin-bottom: 16px;">
            <h4>${inst.institution_name}</h4>
            <p><strong>ID:</strong> ${inst.institution_id} | <strong>Branch:</strong> ${inst.branch || 'Not set'}</p>
            <p><strong>Members:</strong> ${inst.total_members || 0} | 
               <strong>Works Council:</strong> ${inst.total_works_council || 0} | 
               <strong>Works Committee:</strong> ${inst.total_works_committee || 0}</p>
            <button class="btn btn-primary" onclick="viewInstitutionProfile('${inst.id}')">
                Manage Institution
            </button>
        </div>
    `).join('');
}

function loadWorksManagement() {
    const institutionId = document.getElementById('worksInstitutionSelect').value;
    const managementType = document.getElementById('worksManagementType').value;

    if (!institutionId) {
        showError('Please select an institution first.');
        return;
    }

    showWorksManagementPanel(institutionId, managementType);
}

function showWorksManagementPanel(institutionId, managementType) {
    const panel = document.getElementById('worksManagementPanel');

    // Find the selected institution
    const institution = allInstitutions.find(inst => inst.id === institutionId);

    if (!institution) {
        panel.innerHTML = '<div class="info-card"><p>Institution not found.</p></div>';
        return;
    }

    panel.innerHTML = `
        <div class="info-card">
            <h4>Works ${managementType === 'council' ? 'Council' : 'Committee'} Management - ${institution.institution_name}</h4>
            <p><strong>Current Members:</strong> ${institution.members?.length || 0}</p>
            <p>This feature will allow you to add/remove members from the ${managementType === 'council' ? 'Works Council' : 'Works Committee'}.</p>
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-top: 16px;">
                <h5>Available Actions:</h5>
                <ul>
                    <li>View current ${managementType === 'council' ? 'Works Council' : 'Works Committee'} members</li>
                    <li>Add members to ${managementType === 'council' ? 'Works Council' : 'Works Committee'}</li>
                    <li>Remove members from ${managementType === 'council' ? 'Works Council' : 'Works Committee'}</li>
                </ul>
            </div>
            <p style="margin-top: 16px; color: var(--secondary);"><strong>Note:</strong> Drag-and-drop interface coming soon.</p>
        </div>
    `;
}

function showWorksManagementPanel(institutionId, managementType) {
    const panel = document.getElementById('worksManagementPanel');

    // For now, just show a placeholder
    panel.innerHTML = `
        <div class="info-card">
            <h4>Works ${managementType === 'council' ? 'Council' : 'Committee'} Management</h4>
            <p>This feature will allow you to add/remove members from the ${managementType === 'council' ? 'Works Council' : 'Works Committee'}.</p>
            <p><strong>Coming soon:</strong> Drag-and-drop interface to manage representatives.</p>
        </div>
    `;
}

function searchMembersForUpdate() {
    const searchTerm = document.getElementById('updateMemberSearch').value;
    const branchFilter = document.getElementById('updateMemberBranch').value;

    // Simple client-side filtering
    const filtered = allMembers.filter(member => {
        const matchesName = !searchTerm ||
            member.full_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesBranch = !branchFilter || member.branch === branchFilter;
        return matchesName && matchesBranch;
    });

    displayMemberUpdateResults(filtered);
}

function displayMemberUpdateResults(members) {
    const container = document.getElementById('memberUpdateResults');

    if (members.length === 0) {
        container.innerHTML = '<p>No members found matching your criteria.</p>';
        return;
    }

    container.innerHTML = members.map(member => `
        <div class="info-card" style="margin-bottom: 16px;">
            <h4>${member.full_name}</h4>
            <p><strong>Member ID:</strong> ${member.member_id} | 
               <strong>Institution:</strong> ${member.institutions?.institution_name || 'Not set'} | 
               <strong>Branch:</strong> ${member.branch || 'Not set'}</p>
            <p><strong>Position:</strong> ${member.position_in_union} | 
               <strong>Status:</strong> ${member.status}</p>
            <button class="btn btn-primary" onclick="viewMemberProfileAdmin('${member.id}')">
                Edit Member
            </button>
        </div>
    `).join('');
}

// Add these to admin.js for the member creation functionality
document.getElementById('addMemberForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await addNewMember();
});

// Enhanced addNewMember function
async function addNewMember() {
    showLoading();

    try {
        const memberData = {
            member_id: document.getElementById('newMemberId').value,
            full_name: document.getElementById('newMemberName').value,
            national_id: document.getElementById('newMemberNationalId').value,
            date_of_birth: document.getElementById('newMemberDob').value,
            gender: document.getElementById('newMemberGender').value,
            job_title: document.getElementById('newMemberJobTitle').value,
            date_joined: document.getElementById('newMemberDateJoined').value,
            grade: document.getElementById('newMemberGrade').value,
            contact_number: document.getElementById('newMemberContact').value,
            position_in_union: document.getElementById('newMemberPosition').value,
            branch: document.getElementById('newMemberBranch').value,
            institution_id: currentInstitutionForMembers.id
        };

        // 1. Create auth user for the member
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: `${memberData.member_id}@zehsscwu.org`,
            password: memberData.member_id, // Password same as member ID
            email_confirm: true, // Auto-confirm
            user_metadata: {
                role: 'member',
                username: memberData.member_id
            }
        });

        if (authError) throw authError;

        // 2. Create member record
        const { error: memberError } = await supabase
            .from('members')
            .insert({
                id: authData.user.id, // Link to auth user
                ...memberData
            });

        if (memberError) throw memberError;

        hideLoading();
        showSuccess('Member created successfully! Login: ' + memberData.member_id);

    } catch (error) {
        hideLoading();
        showError('Failed to create member: ' + error.message);
    }
}
function updateAddedMembersList() {
    const container = document.getElementById('addedMembersContainer');

    if (addedMembers.length === 0) {
        container.innerHTML = '<p>No members added yet.</p>';
        return;
    }

    container.innerHTML = addedMembers.map((member, index) => `
        <div class="info-card" style="margin-bottom: 8px; padding: 12px;">
            <strong>${member.member_id}</strong> - ${member.full_name}
            <button class="btn" style="background: var(--error); color: white; padding: 4px 8px; margin-left: 8px;" 
                    onclick="removeAddedMember(${index})">
                Remove
            </button>
        </div>
    `).join('');
}

function removeAddedMember(index) {
    addedMembers.splice(index, 1);
    updateAddedMembersList();
}

function finishAddingMembers() {
    showSuccess('Finished adding members! You can now add another institution or continue managing the system.');
    document.getElementById('addMembersSection').style.display = 'none';
    addedMembers = [];
}

async function loadAllMembers() {
    try {
        const { data: members, error } = await supabase
            .from('members')
            .select(`
                *,
                institutions (institution_name)
            `)
            .order('full_name');

        if (error) throw error;

        allMembers = members || [];
        displayMembersAdminTable(allMembers);

    } catch (error) {
        console.error('Error loading members:', error);
        showError('Failed to load members');
    }
}

function displayInstitutionsTable(institutions) {
    const tbody = document.getElementById('institutionsTableBody');

    if (institutions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 20px; color: var(--secondary);">
                    No institutions found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = institutions.map(institution => `
        <tr>
            <td>${institution.institution_name}</td>
            <td>${institution.institution_id}</td>
            <td>${institution.members?.length || 0}</td>
            <td>${institution.email || '-'}</td>
            <td>${institution.branch || '-'}</td>
            <td>
                <button class="btn btn-primary" onclick="viewInstitutionProfile('${institution.id}')" 
                        style="padding: 6px 12px; font-size: 0.8rem;">
                    View Profile
                </button>
            </td>
        </tr>
    `).join('');
}

function displayMembersAdminTable(members) {
    const tbody = document.getElementById('membersAdminTableBody');

    if (members.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 20px; color: var(--secondary);">
                    No members found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = members.map(member => `
        <tr>
            <td>${member.member_id}</td>
            <td>${member.full_name}</td>
            <td>${member.institutions?.institution_name || '-'}</td>
            <td>${member.job_title || '-'}</td>
            <td>${member.grade || '-'}</td>
            <td>
                <span class="status-badge status-${member.status || 'unknown'}">
                    ${member.status || 'unknown'}
                </span>
            </td>
            <td>
                <button class="btn btn-primary" onclick="viewMemberProfileAdmin('${member.id}')" 
                        style="padding: 6px 12px; font-size: 0.8rem;">
                    View/Edit
                </button>
            </td>
        </tr>
    `).join('');
}

// Tab switching function
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab content
    document.getElementById(tabName).classList.add('active');

    // Add active class to clicked tab
    event.target.classList.add('active');

    // Handle specific tab actions
    if (tabName === 'memberRequests') {
        loadMemberRequests();
    } else if (tabName === 'updateProfiles') {
        // Ensure dropdowns are populated when switching to update profiles tab
        populateInstitutionSelect();
    }
}

// Search functionality
document.getElementById('adminSearchForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const searchType = document.getElementById('searchType').value;
    const searchTerm = document.getElementById('searchTerm').value;
    const branch = document.getElementById('searchBranch').value;

    await performAdminSearch(searchType, searchTerm, branch);
});

// Update the performAdminSearch function
async function performAdminSearch(searchType, searchTerm, branch) {
    showLoading();

    try {
        let results = [];
        currentSearchType = searchType;

        switch (searchType) {
            case 'institution':
                results = await searchInstitutionsAdmin(searchTerm, branch);
                currentAdminSearchResults = results;
                break;
            case 'member':
                results = await searchMembersAdmin(searchTerm, branch);
                currentAdminSearchResults = results;
                break;
            case 'memberByJob':
                results = await searchMembersByJobAdmin(searchTerm, branch);
                currentAdminSearchResults = results;
                break;
        }

        displayAdminSearchResults(results, searchType);
        hideLoading();
        updateDownloadButtonLabels();

    } catch (error) {
        hideLoading();
        showError('Search failed: ' + error.message);
    }
}

// Update the searchInstitutions function
function searchInstitutions() {
    const searchTerm = document.getElementById('institutionSearch').value.toLowerCase();
    const filtered = allInstitutions.filter(inst =>
        inst.institution_name.toLowerCase().includes(searchTerm)
    );
    currentInstitutionSearchResults = filtered;
    displayInstitutionsTable(filtered);
    updateDownloadButtonLabels();
}

// Update the searchMembersAdminAdvanced function
async function searchMembersAdminAdvanced(name, jobTitle, grade, institution) {
    showLoading();

    try {
        let query = supabase
            .from('members')
            .select('*, institutions(institution_name)');

        if (name) {
            query = query.ilike('full_name', `%${name}%`);
        }
        if (jobTitle) {
            query = query.ilike('job_title', `%${jobTitle}%`);
        }
        if (grade) {
            query = query.ilike('grade', `%${grade}%`);
        }
        if (institution) {
            query = query.ilike('institutions.institution_name', `%${institution}%`);
        }

        const { data: members, error } = await query;

        if (error) throw error;

        currentMemberSearchResults = members || [];
        displayMembersAdminTable(currentMemberSearchResults);
        hideLoading();
        updateDownloadButtonLabels();

    } catch (error) {
        hideLoading();
        showError('Search failed: ' + error.message);
    }
}

async function searchInstitutionsAdmin(searchTerm, branch) {
    let query = supabase
        .from('institutions')
        .select('*');

    if (searchTerm) {
        query = query.ilike('institution_name', `%${searchTerm}%`);
    }
    if (branch) {
        query = query.eq('branch', branch);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Update the tracking variable for dashboard searches
    currentInstitutionSearchResults = data;

    return data.map(inst => ({ ...inst, type: 'institution' }));
}

async function searchMembersAdmin(searchTerm, branch) {
    let query = supabase
        .from('members')
        .select('*, institutions(institution_name)');

    if (searchTerm) {
        query = query.ilike('full_name', `%${searchTerm}%`);
    }
    if (branch) {
        query = query.eq('branch', branch);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Update the tracking variable for dashboard searches
    currentMemberSearchResults = data;

    return data.map(member => ({ ...member, type: 'member' }));
}

async function searchMembersByJobAdmin(jobTitle, branch) {
    let query = supabase
        .from('members')
        .select('*, institutions(institution_name)');

    if (jobTitle) {
        query = query.ilike('job_title', `%${jobTitle}%`);
    }
    if (branch) {
        query = query.eq('branch', branch);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Update the tracking variable for dashboard searches
    currentMemberSearchResults = data;

    return data.map(member => ({ ...member, type: 'member' }));
}

function displayAdminSearchResults(results, searchType) {
    const tbody = document.getElementById('adminSearchResultsBody');

    if (results.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 20px; color: var(--secondary);">
                    No results found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = results.map(item => `
        <tr>
            <td>
                <span class="status-badge ${item.type === 'institution' ? 'status-active' : 'status-unknown'}">
                    ${item.type}
                </span>
            </td>
            <td>${item.type === 'institution' ? item.institution_id : item.member_id}</td>
            <td>${item.type === 'institution' ? item.institution_name : item.full_name}</td>
            <td>
                ${item.type === 'institution' ?
            `Members: ${item.total_members || 0}` :
            `${item.job_title || '-'} | ${item.institutions?.institution_name || '-'}`
        }
            </td>
            <td>${item.branch || '-'}</td>
            <td>
                <button class="btn btn-primary" 
                        onclick="${item.type === 'institution' ? `viewInstitutionProfile('${item.id}')` : `viewMemberProfileAdmin('${item.id}')`}" 
                        style="padding: 6px 12px; font-size: 0.8rem;">
                    ${item.type === 'institution' ? 'View Institution' : 'View Member'}
                </button>
            </td>
        </tr>
    `).join('');
}

// Institution search and management
function searchInstitutions() {
    const searchTerm = document.getElementById('institutionSearch').value.toLowerCase();
    const filtered = allInstitutions.filter(inst =>
        inst.institution_name.toLowerCase().includes(searchTerm)
    );
    displayInstitutionsTable(filtered);
}

function clearInstitutionSearch() {
    document.getElementById('institutionSearch').value = '';
    currentInstitutionSearchResults = []; // Clear the search results
    displayInstitutionsTable(allInstitutions);
    updateDownloadButtonLabels();
}

// Member search for admin
document.getElementById('memberSearchAdminForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('adminMemberSearchName').value;
    const jobTitle = document.getElementById('adminMemberSearchJob').value;
    const grade = document.getElementById('adminMemberSearchGrade').value;
    const institution = document.getElementById('adminMemberSearchInstitution').value;

    await searchMembersAdminAdvanced(name, jobTitle, grade, institution);
});

async function searchMembersAdminAdvanced(name, jobTitle, grade, institution) {
    showLoading();

    try {
        let query = supabase
            .from('members')
            .select('*, institutions(institution_name)');

        if (name) {
            query = query.ilike('full_name', `%${name}%`);
        }
        if (jobTitle) {
            query = query.ilike('job_title', `%${jobTitle}%`);
        }
        if (grade) {
            query = query.ilike('grade', `%${grade}%`);
        }
        if (institution) {
            query = query.ilike('institutions.institution_name', `%${institution}%`);
        }

        const { data: members, error } = await query;

        if (error) throw error;

        displayMembersAdminTable(members || []);
        hideLoading();

    } catch (error) {
        hideLoading();
        showError('Search failed: ' + error.message);
    }
}

function clearMemberAdminSearch() {
    document.getElementById('adminMemberSearchName').value = '';
    document.getElementById('adminMemberSearchJob').value = '';
    document.getElementById('adminMemberSearchGrade').value = '';
    document.getElementById('adminMemberSearchInstitution').value = '';
    currentMemberSearchResults = []; // Clear the search results
    displayMembersAdminTable(allMembers);
    updateDownloadButtonLabels(); // Add this line
}

// Institution profile modal
async function viewInstitutionProfile(institutionId) {
    showLoading();

    try {
        const { data: institution, error } = await supabase
            .from('institutions')
            .select(`
                *,
                members (*)
            `)
            .eq('id', institutionId)
            .single();

        if (error) throw error;

        selectedInstitution = institution;
        displayInstitutionModal(institution);

        // Load works council and committee data
        await loadAdminWorksData(institutionId);

        hideLoading();

    } catch (error) {
        hideLoading();
        showError('Failed to load institution profile: ' + error.message);
    }
}

async function loadAdminWorksData(institutionId) {
    try {
        // Load works council members
        const { data: councilMembers, error: councilError } = await supabase
            .from('works_councils')
            .select(`
                id, rank,
                members (id, member_id, full_name)
            `)
            .eq('institution_id', institutionId);

        if (councilError) throw councilError;

        // Load works committee members
        const { data: committeeMembers, error: committeeError } = await supabase
            .from('works_committees')
            .select(`
                id, rank,
                members (id, member_id, full_name)
            `)
            .eq('institution_id', institutionId);

        if (committeeError) throw committeeError;

        // Display works council
        const councilContainer = document.getElementById('adminCurrentWorksCouncil');
        if (councilContainer) {
            councilContainer.innerHTML = councilMembers && councilMembers.length > 0 ? `
                <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
                    <h5 style="margin-bottom: 8px;">Current Members:</h5>
                    ${councilMembers.map(member => `
                        <div style="display: flex; justify-content: space-between; align-items: center; 
                                    padding: 8px; background: #f9fafb; border-radius: 4px; margin-bottom: 8px;">
                            <div>
                                <strong>${member.members.full_name}</strong><br>
                                <small style="color: var(--secondary);">${member.rank}</small>
                            </div>
                            <button class="btn" style="background: var(--error); color: white; padding: 4px 8px; font-size: 0.8rem;" 
                                    onclick="adminRemoveFromWorksCouncil('${member.id}', '${institutionId}')">
                                Remove
                            </button>
                        </div>
                    `).join('')}
                </div>
            ` : '<p style="color: var(--secondary); font-size: 0.9rem;">No Works Council members yet.</p>';
        }

        // Display works committee
        const committeeContainer = document.getElementById('adminCurrentWorksCommittee');
        if (committeeContainer) {
            committeeContainer.innerHTML = committeeMembers && committeeMembers.length > 0 ? `
                <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
                    <h5 style="margin-bottom: 8px;">Current Members:</h5>
                    ${committeeMembers.map(member => `
                        <div style="display: flex; justify-content: space-between; align-items: center; 
                                    padding: 8px; background: #f9fafb; border-radius: 4px; margin-bottom: 8px;">
                            <div>
                                <strong>${member.members.full_name}</strong><br>
                                <small style="color: var(--secondary);">${member.rank}</small>
                            </div>
                            <button class="btn" style="background: var(--error); color: white; padding: 4px 8px; font-size: 0.8rem;" 
                                    onclick="adminRemoveFromWorksCommittee('${member.id}', '${institutionId}')">
                                Remove
                            </button>
                        </div>
                    `).join('')}
                </div>
            ` : '<p style="color: var(--secondary); font-size: 0.9rem;">No Works Committee members yet.</p>';
        }

    } catch (error) {
        console.error('Error loading works data:', error);
    }
}

async function adminAddToWorksCouncil(institutionId) {
    const memberId = document.getElementById('adminWorksCouncilMember').value;
    const rank = document.getElementById('adminWorksCouncilRank').value;

    if (!memberId || !rank) {
        showError('Please select a member and enter a rank');
        return;
    }

    showLoading();

    try {
        const { error } = await supabase
            .from('works_councils')
            .insert({
                institution_id: institutionId,
                member_id: memberId,
                rank: rank
            });

        if (error) throw error;

        hideLoading();
        showSuccess('Member added to Works Council successfully!');

        // Clear inputs
        document.getElementById('adminWorksCouncilMember').value = '';
        document.getElementById('adminWorksCouncilRank').value = '';

        // Reload works data
        await loadAdminWorksData(institutionId);

    } catch (error) {
        hideLoading();
        showError('Failed to add to Works Council: ' + error.message);
    }
}

async function adminAddToWorksCommittee(institutionId) {
    const memberId = document.getElementById('adminWorksCommitteeMember').value;
    const rank = document.getElementById('adminWorksCommitteeRank').value;

    if (!memberId || !rank) {
        showError('Please select a member and enter a rank');
        return;
    }

    showLoading();

    try {
        const { error } = await supabase
            .from('works_committees')
            .insert({
                institution_id: institutionId,
                member_id: memberId,
                rank: rank
            });

        if (error) throw error;

        hideLoading();
        showSuccess('Member added to Works Committee successfully!');

        // Clear inputs
        document.getElementById('adminWorksCommitteeMember').value = '';
        document.getElementById('adminWorksCommitteeRank').value = '';

        // Reload works data
        await loadAdminWorksData(institutionId);

    } catch (error) {
        hideLoading();
        showError('Failed to add to Works Committee: ' + error.message);
    }
}

async function adminRemoveFromWorksCouncil(worksCouncilId, institutionId) {
    if (!confirm('Are you sure you want to remove this member from Works Council?')) {
        return;
    }

    showLoading();

    try {
        const { error } = await supabase
            .from('works_councils')
            .delete()
            .eq('id', worksCouncilId);

        if (error) throw error;

        hideLoading();
        showSuccess('Member removed from Works Council!');

        await loadAdminWorksData(institutionId);

    } catch (error) {
        hideLoading();
        showError('Failed to remove member: ' + error.message);
    }
}

async function adminRemoveFromWorksCommittee(worksCommitteeId, institutionId) {
    if (!confirm('Are you sure you want to remove this member from Works Committee?')) {
        return;
    }

    showLoading();

    try {
        const { error } = await supabase
            .from('works_committees')
            .delete()
            .eq('id', worksCommitteeId);

        if (error) throw error;

        hideLoading();
        showSuccess('Member removed from Works Committee!');

        await loadAdminWorksData(institutionId);

    } catch (error) {
        hideLoading();
        showError('Failed to remove member: ' + error.message);
    }
}

function displayInstitutionModal(institution) {
    const modalContent = document.getElementById('institutionModalContent');

    modalContent.innerHTML = `
        <form id="editInstitutionForm">
            <div class="info-card">
                <h3 style="margin-bottom: 16px; color: var(--secondary);">Institution Details</h3>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Institution ID</label>
                        <input type="text" class="form-input" value="${institution.institution_id}" readonly 
                               style="background: #f5f5f5;">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Institution Name</label>
                        <input type="text" class="form-input" id="editInstName" 
                               value="${institution.institution_name}">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-input" id="editInstEmail" 
                               value="${institution.email || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Landline</label>
                        <input type="tel" class="form-input" id="editInstLandline" 
                               value="${institution.landline || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Head Contact</label>
                        <input type="tel" class="form-input" id="editInstHead" 
                               value="${institution.head_contact || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Bursar Contact</label>
                        <input type="tel" class="form-input" id="editInstBursar" 
                               value="${institution.bursar_contact || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Branch</label>
                        <select class="form-select" id="editInstBranch">
                            <option value="Matabeleland North" ${institution.branch === 'Matabeleland North' ? 'selected' : ''}>Matabeleland North</option>
                            <option value="Matabeleland South" ${institution.branch === 'Matabeleland South' ? 'selected' : ''}>Matabeleland South</option>
                            <option value="Bulawayo" ${institution.branch === 'Bulawayo' ? 'selected' : ''}>Bulawayo</option>
                        </select>
                    </div>
                </div>
            </div>
        </form>
        
        <div class="info-card" style="margin-top: 20px;">
            <h3 style="margin-bottom: 16px; color: var(--secondary);">Members (${institution.members?.length || 0})</h3>
            ${institution.members && institution.members.length > 0 ? `
                <div style="overflow-x: auto;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Member ID</th>
                                <th>Name</th>
                                <th>Job Title</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${institution.members.map(member => `
                                <tr>
                                    <td>${member.member_id}</td>
                                    <td>${member.full_name}</td>
                                    <td>${member.job_title || '-'}</td>
                                    <td>
                                        <span class="status-badge status-${member.status || 'unknown'}">
                                            ${member.status || 'unknown'}
                                        </span>
                                    </td>
                                    <td>
                                        <button class="btn btn-primary" onclick="viewMemberProfileAdmin('${member.id}')" 
                                                style="padding: 6px 12px; font-size: 0.8rem;">
                                            View
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : `
                <p style="text-align: center; color: var(--secondary);">No members found for this institution</p>
            `}
        </div>

        <div class="info-card" style="margin-top: 20px;">
            <h3 style="margin-bottom: 16px; color: var(--secondary);">Works Council & Committee Management</h3>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <!-- Works Council Section -->
                <div>
                    <h4 style="margin-bottom: 12px;">Works Council</h4>
                    <div class="form-group">
                        <label class="form-label">Add Member to Council</label>
                        <select class="form-select" id="adminWorksCouncilMember">
                            <option value="">Select Member</option>
                            ${institution.members?.map(m => `
                                <option value="${m.id}">${m.full_name} (${m.member_id})</option>
                            `).join('') || ''}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Rank/Position</label>
                        <input type="text" class="form-input" id="adminWorksCouncilRank" 
                               placeholder="e.g., Chairperson">
                    </div>
                    
                    <button class="btn btn-primary" onclick="adminAddToWorksCouncil('${institution.id}')" 
                            style="width: 100%; margin-bottom: 16px;">
                        Add to Works Council
                    </button>
                    
                    <div id="adminCurrentWorksCouncil">
                        <!-- Dynamic content loaded by loadAdminWorksData() -->
                    </div>
                </div>
                
                <!-- Works Committee Section -->
                <div>
                    <h4 style="margin-bottom: 12px;">Works Committee</h4>
                    <div class="form-group">
                        <label class="form-label">Add Member to Committee</label>
                        <select class="form-select" id="adminWorksCommitteeMember">
                            <option value="">Select Member</option>
                            ${institution.members?.map(m => `
                                <option value="${m.id}">${m.full_name} (${m.member_id})</option>
                            `).join('') || ''}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Rank/Position</label>
                        <input type="text" class="form-input" id="adminWorksCommitteeRank" 
                               placeholder="e.g., Secretary">
                    </div>
                    
                    <button class="btn btn-primary" onclick="adminAddToWorksCommittee('${institution.id}')" 
                            style="width: 100%; margin-bottom: 16px;">
                        Add to Works Committee
                    </button>
                    
                    <div id="adminCurrentWorksCommittee">
                        <!-- Dynamic content loaded by loadAdminWorksData() -->
                    </div>
                </div>
            </div>
        </div>

        <div style="margin-top: 20px;">
            <!-- Download Options -->
            <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                <h4 style="margin-bottom: 12px;">Download Options</h4>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button class="btn btn-secondary" onclick="downloadSingleInstitution('${institution.id}')" 
                            style="font-size: 0.9rem;">
                        📥 Download Institution (Excel)
                    </button>
                    <button class="btn btn-secondary" onclick="downloadInstitutionMembers('${institution.id}')" 
                            style="font-size: 0.9rem;">
                        📥 Download Members (Excel)
                    </button>
                    <button class="btn btn-secondary" onclick="downloadInstitutionComplete('${institution.id}')" 
                            style="font-size: 0.9rem;">
                        📥 Download Complete Report (Excel)
                    </button>
                </div>
            </div>
            
            <!-- Action Buttons -->
            <div style="display: flex; gap: 12px; justify-content: space-between;">
                <div style="display: flex; gap: 12px;">
                    <button class="btn btn-primary" onclick="saveInstitutionChanges()">
                        Save Changes
                    </button>
                    <button class="btn btn-secondary" onclick="closeInstitutionModal()">
                        Cancel
                    </button>
                </div>
                <button class="btn" style="background: var(--error); color: white;" 
                        onclick="deleteInstitution('${institution.id}')">
                    Delete Institution
                </button>
            </div>
        </div>
    `;

    document.getElementById('institutionModal').style.display = 'block';
}

async function saveInstitutionChanges() {
    showLoading();

    try {
        const updateData = {
            institution_name: document.getElementById('editInstName').value,
            email: document.getElementById('editInstEmail').value,
            landline: document.getElementById('editInstLandline').value,
            head_contact: document.getElementById('editInstHead').value,
            bursar_contact: document.getElementById('editInstBursar').value,
            branch: document.getElementById('editInstBranch').value,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('institutions')
            .update(updateData)
            .eq('id', selectedInstitution.id);

        if (error) throw error;

        hideLoading();
        showSuccess('Institution profile updated successfully!');
        closeInstitutionModal();

        // Reload institutions data
        await loadAllInstitutions();
        await loadSystemStats();

    } catch (error) {
        hideLoading();
        showError('Failed to update institution profile: ' + error.message);
    }
}

function closeInstitutionModal() {
    document.getElementById('institutionModal').style.display = 'none';
    selectedInstitution = null;
}

// Member profile modal for admin
async function viewMemberProfileAdmin(memberId) {
    showLoading();

    try {
        const { data: member, error } = await supabase
            .from('members')
            .select('*, institutions(institution_name, institution_id)')
            .eq('id', memberId)
            .single();

        if (error) throw error;

        selectedMemberAdmin = member;
        displayMemberModalAdmin(member);
        hideLoading();

    } catch (error) {
        hideLoading();
        showError('Failed to load member profile: ' + error.message);
    }
}

function displayMemberModalAdmin(member) {
    const modalContent = document.getElementById('memberModalAdminContent');

    modalContent.innerHTML = `
        <form id="memberEditFormAdmin">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="form-group">
                    <label class="form-label">Member ID</label>
                    <input type="text" class="form-input" value="${member.member_id}" readonly 
                           style="background: #f5f5f5;">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Full Name</label>
                    <input type="text" class="form-input" id="modalAdminFullName" value="${member.full_name || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Institution</label>
                    <input type="text" class="form-input" value="${member.institutions?.institution_name || '-'}" readonly 
                           style="background: #f5f5f5;">
                </div>
                
                <div class="form-group">
                    <label class="form-label">National ID</label>
                    <input type="text" class="form-input" id="modalAdminNationalId" value="${member.national_id || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Date of Birth</label>
                    <input type="date" class="form-input" id="modalAdminDob" value="${member.date_of_birth || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Gender</label>
                    <select class="form-select" id="modalAdminGender">
                        <option value="">Select Gender</option>
                        <option value="Male" ${member.gender === 'Male' ? 'selected' : ''}>Male</option>
                        <option value="Female" ${member.gender === 'Female' ? 'selected' : ''}>Female</option>
                        <option value="Other" ${member.gender === 'Other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Job Title</label>
                    <input type="text" class="form-input" id="modalAdminJobTitle" value="${member.job_title || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Date Joined</label>
                    <input type="date" class="form-input" id="modalAdminDateJoined" value="${member.date_joined || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Grade</label>
                    <input type="text" class="form-input" id="modalAdminGrade" value="${member.grade || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Contact Number</label>
                    <input type="tel" class="form-input" id="modalAdminContact" value="${member.contact_number || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Status</label>
                    <select class="form-select" id="modalAdminStatus">
                        <option value="active" ${member.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="unknown" ${member.status === 'unknown' ? 'selected' : ''}>Unknown</option>
                        <option value="retired" ${member.status === 'retired' ? 'selected' : ''}>Retired</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Position in Union</label>
                    <select class="form-select" id="modalAdminPosition">
                        <option value="Member" ${member.position_in_union === 'Member' ? 'selected' : ''}>Member</option>
                        <option value="Chairperson" ${member.position_in_union === 'Chairperson' ? 'selected' : ''}>Chairperson</option>
                        <option value="Secretary" ${member.position_in_union === 'Secretary' ? 'selected' : ''}>Secretary</option>
                        <option value="Treasurer" ${member.position_in_union === 'Treasurer' ? 'selected' : ''}>Treasurer</option>
                        <option value="Board member" ${member.position_in_union === 'Board member' ? 'selected' : ''}>Board member</option>
                        <option value="Executive member" ${member.position_in_union === 'Executive member' ? 'selected' : ''}>Executive member</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Branch</label>
                    <select class="form-select" id="modalAdminBranch">
                        <option value="Matabeleland North" ${member.branch === 'Matabeleland North' ? 'selected' : ''}>Matabeleland North</option>
                        <option value="Matabeleland South" ${member.branch === 'Matabeleland South' ? 'selected' : ''}>Matabeleland South</option>
                        <option value="Bulawayo" ${member.branch === 'Bulawayo' ? 'selected' : ''}>Bulawayo</option>
                    </select>
                </div>
            </div>
        </form>
    `;

    document.getElementById('memberModalAdmin').style.display = 'block';
}

function closeMemberModalAdmin() {
    document.getElementById('memberModalAdmin').style.display = 'none';
    selectedMemberAdmin = null;
}

async function saveMemberChangesAdmin() {
    showLoading();

    try {
        const updateData = {
            full_name: document.getElementById('modalAdminFullName').value,
            national_id: document.getElementById('modalAdminNationalId').value,
            date_of_birth: document.getElementById('modalAdminDob').value,
            gender: document.getElementById('modalAdminGender').value,
            job_title: document.getElementById('modalAdminJobTitle').value,
            date_joined: document.getElementById('modalAdminDateJoined').value,
            grade: document.getElementById('modalAdminGrade').value,
            contact_number: document.getElementById('modalAdminContact').value,
            status: document.getElementById('modalAdminStatus').value,
            position_in_union: document.getElementById('modalAdminPosition').value,
            branch: document.getElementById('modalAdminBranch').value,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('members')
            .update(updateData)
            .eq('id', selectedMemberAdmin.id);

        if (error) throw error;

        hideLoading();
        showSuccess('Member profile updated successfully!');
        closeMemberModalAdmin();

        // Reload members data
        await loadAllMembers();

    } catch (error) {
        hideLoading();
        showError('Failed to update member profile: ' + error.message);
    }
}

async function deleteMemberAdmin() {
    if (!selectedMemberAdmin || !confirm('Are you sure you want to delete this member? This action cannot be undone.')) {
        return;
    }

    showLoading();

    try {
        // Delete member from auth and profiles
        const { error: authError } = await supabase.auth.admin.deleteUser(selectedMemberAdmin.id);
        if (authError) throw authError;

        // Delete member record
        const { error: memberError } = await supabase
            .from('members')
            .delete()
            .eq('id', selectedMemberAdmin.id);

        if (memberError) throw memberError;

        hideLoading();
        showSuccess('Member deleted successfully!');
        closeMemberModalAdmin();

        // Reload data
        await loadAllMembers();
        await loadSystemStats();

    } catch (error) {
        hideLoading();
        showError('Failed to delete member: ' + error.message);
    }
}

async function deleteInstitution(institutionId) {
    if (!confirm('Are you sure you want to delete this institution and all its members? This action cannot be undone.')) {
        return;
    }

    showLoading();

    try {
        // Get all members of this institution
        const { data: members, error: membersError } = await supabase
            .from('members')
            .select('id')
            .eq('institution_id', institutionId);

        if (membersError) throw membersError;

        // Delete all members (this will cascade to auth/profiles due to foreign key)
        if (members && members.length > 0) {
            for (const member of members) {
                await supabase.auth.admin.deleteUser(member.id);
            }
        }

        // Delete institution
        const { error: instError } = await supabase
            .from('institutions')
            .delete()
            .eq('id', institutionId);

        if (instError) throw instError;

        hideLoading();
        showSuccess('Institution and all members deleted successfully!');
        closeInstitutionModal();

        // Reload data
        await loadAllInstitutions();
        await loadAllMembers();
        await loadSystemStats();

    } catch (error) {
        hideLoading();
        showError('Failed to delete institution: ' + error.message);
    }
}

// Add institution functionality
document.getElementById('addInstitutionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await createNewInstitution();
});

// In your admin.js - Enhanced createNewInstitution function
async function createNewInstitution() {
    showLoading();

    try {
        const institutionData = {
            institution_id: document.getElementById('newInstitutionId').value,
            institution_name: document.getElementById('newInstitutionName').value,
            email: document.getElementById('newInstitutionEmail').value,
            landline: document.getElementById('newInstitutionLandline').value,
            head_contact: document.getElementById('newInstitutionHead').value,
            bursar_contact: document.getElementById('newInstitutionBursar').value,
            branch: document.getElementById('newInstitutionBranch').value
        };

        // 1. Create auth user for institution
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: `${institutionData.institution_id}@zehsscwu.org`,
            password: institutionData.institution_id,
            email_confirm: true,
            user_metadata: {
                role: 'institution',
                username: institutionData.institution_id
            }
        });

        if (authError) throw authError;

        // 2. Create institution record
        const { error: instError } = await supabase
            .from('institutions')
            .insert({
                id: authData.user.id,
                ...institutionData,
                total_members: 0,
                total_works_council: 0,
                total_works_committee: 0
            });

        if (instError) throw instError;

        hideLoading();
        showSuccess('Institution created successfully!');

        // Show add members section
        document.getElementById('addMembersSection').style.display = 'block';
        currentInstitutionForMembers = {
            id: authData.user.id,
            ...institutionData
        };
        addedMembers = [];

    } catch (error) {
        hideLoading();
        showError('Failed to create institution: ' + error.message);
    }
}

// Admin adding members to existing institutions
function loadAdminAddMemberForm() {
    const institutionId = document.getElementById('adminAddMemberInstitution').value;
    const memberId = document.getElementById('adminNewMemberId').value;

    if (!institutionId) {
        showError('Please select an institution first.');
        return;
    }

    if (!memberId) {
        showError('Please enter a member ID.');
        return;
    }

    // Validate member ID format
    if (!memberId.match(/^ZEH-\d{4}$/)) {
        showError('Please enter a valid Member ID in format ZEH-0000');
        return;
    }

    const institution = allInstitutions.find(inst => inst.id === institutionId);
    const container = document.getElementById('adminAddMemberFormContainer');

    container.innerHTML = `
        <form id="adminAddMemberForm">
            <h4>Add Member to ${institution.institution_name}</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="form-group">
                    <label class="form-label">Member ID</label>
                    <input type="text" class="form-input" value="${memberId}" readonly>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Full Name *</label>
                    <input type="text" class="form-input" id="adminMemberFullName" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Job Title *</label>
                    <input type="text" class="form-input" id="adminMemberJobTitle" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Date Joined *</label>
                    <input type="date" class="form-input" id="adminMemberDateJoined" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Contact Number</label>
                    <input type="tel" class="form-input" id="adminMemberContact">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Position</label>
                    <select class="form-select" id="adminMemberPosition">
                        <option value="Member">Member</option>
                        <option value="Chairperson">Chairperson</option>
                        <option value="Secretary">Secretary</option>
                        <option value="Treasurer">Treasurer</option>
                        <option value="Board member">Board member</option>
                        <option value="Executive member">Executive member</option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Branch</label>
                    <select class="form-select" id="adminMemberBranch">
                        <option value="Matabeleland North">Matabeleland North</option>
                        <option value="Matabeleland South">Matabeleland South</option>
                        <option value="Bulawayo">Bulawayo</option>
                    </select>
                </div>
            </div>
            
            <button type="submit" class="btn btn-primary" style="margin-top: 16px;">
                Add Member
            </button>
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('adminAddMemberFormContainer').style.display = 'none'" style="margin-top: 16px; margin-left: 8px;">
                Cancel
            </button>
        </form>
    `;

    container.style.display = 'block';

    // Add form submit handler
    document.getElementById('adminAddMemberForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await adminAddMemberToInstitution(institutionId, memberId);
    });
}

async function adminAddMemberToInstitution(institutionId, memberId) {
    showLoading();

    try {
        // Check if member ID already exists
        const { data: existingMember, error: checkError } = await supabase
            .from('members')
            .select('member_id')
            .eq('member_id', memberId)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }

        if (existingMember) {
            throw new Error(`Member ID ${memberId} is already taken. Please use a different ID.`);
        }

        const memberData = {
            member_id: memberId,
            full_name: document.getElementById('adminMemberFullName').value,
            job_title: document.getElementById('adminMemberJobTitle').value,
            date_joined: document.getElementById('adminMemberDateJoined').value,
            contact_number: document.getElementById('adminMemberContact').value,
            position_in_union: document.getElementById('adminMemberPosition').value,
            branch: document.getElementById('adminMemberBranch').value,
            institution_id: institutionId,
            status: 'active'
        };

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: `${memberData.member_id}@zehsscwu.org`,
            password: memberData.member_id,
            email_confirm: true,
            user_metadata: {
                role: 'member',
                username: memberData.member_id
            }
        });

        if (authError) throw authError;

        // Create profile
        await supabase.from('profiles').insert({
            id: authData.user.id,
            role: 'member',
            username: memberData.member_id
        });

        // Create member record
        const { error: memberError } = await supabase.from('members').insert({
            id: authData.user.id,
            ...memberData
        });

        if (memberError) throw memberError;

        hideLoading();
        showSuccess('Member added successfully!');

        // Reset form
        document.getElementById('adminAddMemberFormContainer').style.display = 'none';
        document.getElementById('adminNewMemberId').value = '';

        // Reload data
        await loadAllMembers();
        await loadSystemStats();

    } catch (error) {
        hideLoading();
        showError('Failed to add member: ' + error.message);
    }
}

// Populate institution dropdown
function populateAdminInstitutionDropdown() {
    const select = document.getElementById('adminAddMemberInstitution');
    select.innerHTML = '<option value="">Select Institution</option>';

    allInstitutions.forEach(institution => {
        const option = document.createElement('option');
        option.value = institution.id;
        option.textContent = `${institution.institution_name} (${institution.institution_id})`;
        select.appendChild(option);
    });
}

// Member requests management for admin
// Member requests management for admin
async function loadMemberRequests() {
    showLoading();

    try {
        console.log('Loading member requests...'); // Debug log

        // First, determine the next available member ID
        await determineNextMemberId();

        // Query member_requests table
        const { data: requests, error, count } = await supabase
            .from('member_requests')
            .select(`
                *,
                institutions(institution_name, institution_id)
            `, { count: 'exact' })
            .eq('status', 'pending')
            .order('created_at', { ascending: true });

        console.log('Query results:', { requests, error, count }); // Debug log

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        console.log(`Found ${requests?.length || 0} pending requests`); // Debug log

        if (requests && requests.length > 0) {
            console.log('Sample request:', requests[0]); // Debug log - check if institutions data is loaded
        }

        displayMemberRequests(requests || []);
        hideLoading();

    } catch (error) {
        hideLoading();
        console.error('Full error loading member requests:', error);
        showError('Failed to load member requests: ' + error.message);
    }
}

// Determine the next available member ID
async function determineNextMemberId() {
    try {
        const { data: members, error } = await supabase
            .from('members')
            .select('member_id')
            .order('member_id', { ascending: false })
            .limit(1);

        if (error) throw error;

        let nextId = 'ZEH-0001'; // Default starting ID

        if (members && members.length > 0) {
            const lastMemberId = members[0].member_id;
            console.log('Last member ID found:', lastMemberId); // Debug log

            // Extract number and increment
            const match = lastMemberId.match(/ZEH-(\d+)/);
            if (match) {
                const lastNumber = parseInt(match[1]);
                nextId = `ZEH-${String(lastNumber + 1).padStart(4, '0')}`;
            }
        }

        console.log('Next available ID:', nextId); // Debug log
        document.getElementById('nextMemberId').value = nextId;

    } catch (error) {
        console.error('Error determining next member ID:', error);
        document.getElementById('nextMemberId').value = 'ZEH-0001';
    }
}

function displayMemberRequests(requests) {
    const container = document.getElementById('memberRequestsContainer');
    const nextMemberId = document.getElementById('nextMemberId').value;

    if (requests.length === 0) {
        container.innerHTML = '<p>No pending member requests.</p>';
        return;
    }

    container.innerHTML = `
        <p><strong>Next Member ID to assign:</strong> ${nextMemberId}</p>
        ${requests.map(request => `
            <div class="info-card" style="margin-bottom: 16px;">
                <h4>${request.full_name}</h4>
                <p><strong>Institution:</strong> ${request.institutions.institution_name}</p>
                <p><strong>Job Title:</strong> ${request.job_title} | <strong>Date Joined:</strong> ${request.date_joined}</p>
                <p><strong>Contact:</strong> ${request.contact_number} | <strong>Position:</strong> ${request.position_in_union}</p>
                <p><strong>Requested:</strong> ${new Date(request.created_at).toLocaleDateString()}</p>
                
                <div class="form-group" style="max-width: 200px; margin: 12px 0;">
                    <label class="form-label">Assign Member ID</label>
                    <input type="text" class="form-input" id="assignedId_${request.id}" 
                           value="${nextMemberId}" placeholder="ZEH-0000">
                </div>
                
                <div style="display: flex; gap: 12px; margin-top: 12px;">
                    <button class="btn btn-primary" onclick="approveMemberRequest('${request.id}')">
                        Approve & Create Member
                    </button>
                    <button class="btn" style="background: var(--error); color: white;" 
                            onclick="rejectMemberRequest('${request.id}')">
                        Reject
                    </button>
                </div>
            </div>
        `).join('')}
    `;
}

async function approveMemberRequest(requestId) {
    showLoading();

    try {
        const assignedMemberId = document.getElementById(`assignedId_${requestId}`).value;

        if (!assignedMemberId || !assignedMemberId.match(/^ZEH-\d{4}$/)) {
            throw new Error('Please enter a valid Member ID in format ZEH-0000');
        }

        // Check if member ID is already taken
        const { data: existingMember, error: checkError } = await supabase
            .from('members')
            .select('member_id')
            .eq('member_id', assignedMemberId)
            .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows found
            throw checkError;
        }

        if (existingMember) {
            throw new Error(`Member ID ${assignedMemberId} is already taken. Please use a different ID.`);
        }

        // Get the request details
        const { data: request, error: requestError } = await supabase
            .from('member_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (requestError) throw requestError;

        // Create the auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: `${assignedMemberId}@zehsscwu.org`,
            password: assignedMemberId,
            email_confirm: true,
            user_metadata: {
                role: 'member',
                username: assignedMemberId
            }
        });

        if (authError) throw authError;

        // Create profile
        await supabase.from('profiles').insert({
            id: authData.user.id,
            role: 'member',
            username: assignedMemberId
        });

        // Create member record
        const { error: memberError } = await supabase
            .from('members')
            .insert({
                id: authData.user.id,
                member_id: assignedMemberId,
                full_name: request.full_name,
                institution_id: request.institution_id,
                national_id: request.national_id,
                date_of_birth: request.date_of_birth,
                gender: request.gender,
                job_title: request.job_title,
                date_joined: request.date_joined,
                grade: request.grade,
                contact_number: request.contact_number,
                position_in_union: request.position_in_union,
                branch: request.branch,
                status: 'active'
            });

        if (memberError) throw memberError;

        // Update request status to approved and store the assigned ID
        await supabase
            .from('member_requests')
            .update({
                status: 'approved',
                assigned_member_id: assignedMemberId,
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId);

        hideLoading();
        showSuccess(`Member ${assignedMemberId} created successfully for ${request.full_name}!`);

        // Update the next available ID
        await determineNextMemberId();

        // Reload requests and members
        await loadMemberRequests();
        await loadAllMembers();
        await loadSystemStats();

    } catch (error) {
        hideLoading();
        showError('Failed to approve member request: ' + error.message);
    }
}

async function rejectMemberRequest(requestId) {
    if (!confirm('Are you sure you want to reject this member request?')) {
        return;
    }

    showLoading();

    try {
        await supabase
            .from('member_requests')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .eq('id', requestId);

        hideLoading();
        showSuccess('Member request rejected.');

        await loadMemberRequests();

    } catch (error) {
        hideLoading();
        showError('Failed to reject member request: ' + error.message);
    }
}


// Contact support function
function contactAdminSupport() {
    const message = "Hi, ZEHSSCWU. I'm an administrator and I would like assistance with ---";
    const whatsappUrl = `https://wa.me/263777217619?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

function clearAdminSearch() {
    document.getElementById('searchTerm').value = '';
    document.getElementById('searchBranch').value = '';

    // Clear ALL search tracking variables
    currentAdminSearchResults = [];
    currentInstitutionSearchResults = [];
    currentMemberSearchResults = [];
    currentSearchType = null;

    document.getElementById('adminSearchResultsBody').innerHTML = '';
    updateDownloadButtonLabels();
}

// ==================== DOWNLOAD FUNCTIONS ====================

// Download single institution basic info
async function downloadSingleInstitution(institutionId) {
    showLoading();
    try {
        const { data: institution, error } = await supabase
            .from('institutions')
            .select('*')
            .eq('id', institutionId)
            .single();

        if (error) throw error;

        const formattedData = [formatInstitutionForDownload(institution)];
        const filename = `${institution.institution_id}_Profile_${new Date().toISOString().split('T')[0]}.xlsx`;

        downloadExcel(formattedData, filename, 'Institution Profile');

        hideLoading();
        showSuccess('Institution profile downloaded successfully!');
    } catch (error) {
        hideLoading();
        showError('Failed to download: ' + error.message);
    }
}

// Download institution members only - Updated to Excel format
async function downloadInstitutionMembers(institutionId) {
    showLoading();
    try {
        const { data: members, error } = await supabase
            .from('members')
            .select('*, institutions(institution_name)')
            .eq('institution_id', institutionId);

        if (error) throw error;

        if (!members || members.length === 0) {
            hideLoading();
            showError('No members found for this institution');
            return;
        }

        const formattedData = members.map(formatMemberForDownload);
        const institution = members[0].institutions.institution_name.replace(/\s+/g, '_');
        const filename = `${institution}_Members_${new Date().toISOString().split('T')[0]}.xlsx`;

        // Changed from downloadCSV to downloadExcel
        downloadExcel(formattedData, filename, 'Members');

        hideLoading();
        showSuccess('Members downloaded successfully in Excel format!');
    } catch (error) {
        hideLoading();
        showError('Failed to download: ' + error.message);
    }
}

// Download complete institution report (institution + members + works council + works committee)
async function downloadInstitutionComplete(institutionId) {
    showLoading();
    try {
        // Get institution data
        const { data: institution, error: instError } = await supabase
            .from('institutions')
            .select('*')
            .eq('id', institutionId)
            .single();

        if (instError) throw instError;

        // Get members
        const { data: members, error: memError } = await supabase
            .from('members')
            .select('*, institutions(institution_name)')
            .eq('institution_id', institutionId);

        if (memError) throw memError;

        // Get works council
        const { data: council, error: councilError } = await supabase
            .from('works_councils')
            .select(`
                rank,
                members(member_id, full_name),
                institutions(institution_name)
            `)
            .eq('institution_id', institutionId);

        if (councilError) throw councilError;

        // Get works committee
        const { data: committee, error: committeeError } = await supabase
            .from('works_committees')
            .select(`
                rank,
                members(member_id, full_name),
                institutions(institution_name)
            `)
            .eq('institution_id', institutionId);

        if (committeeError) throw committeeError;

        // Format data for multiple sheets
        const sheets = [
            {
                name: 'Institution Profile',
                data: [formatInstitutionForDownload(institution)]
            },
            {
                name: 'Members',
                data: members.map(formatMemberForDownload)
            },
            {
                name: 'Works Council',
                data: council.length > 0 ? formatWorksForDownload(council, 'Works Council') : [{ 'Message': 'No Works Council members' }]
            },
            {
                name: 'Works Committee',
                data: committee.length > 0 ? formatWorksForDownload(committee, 'Works Committee') : [{ 'Message': 'No Works Committee members' }]
            }
        ];

        const filename = `${institution.institution_id}_Complete_Report_${new Date().toISOString().split('T')[0]}.xlsx`;

        downloadExcelMultiSheet(sheets, filename);

        hideLoading();
        showSuccess('Complete report downloaded successfully!');
    } catch (error) {
        hideLoading();
        showError('Failed to download: ' + error.message);
    }
}

// Download all institutions
async function downloadAllInstitutions() {
    showLoading();
    try {
        const { data: institutions, error } = await supabase
            .from('institutions')
            .select('*')
            .order('institution_name');

        if (error) throw error;

        const formattedData = institutions.map(formatInstitutionForDownload);
        const filename = `All_Institutions_${new Date().toISOString().split('T')[0]}.xlsx`;

        downloadExcel(formattedData, filename, 'All Institutions');

        hideLoading();
        showSuccess('All institutions downloaded successfully!');
    } catch (error) {
        hideLoading();
        showError('Failed to download: ' + error.message);
    }
}

// Download all members across all institutions
async function downloadAllMembers() {
    showLoading();
    try {
        const { data: members, error } = await supabase
            .from('members')
            .select('*, institutions(institution_name)')
            .order('full_name');

        if (error) throw error;

        const formattedData = members.map(formatMemberForDownload);
        const filename = `All_Members_${new Date().toISOString().split('T')[0]}.xlsx`;

        downloadExcel(formattedData, filename, 'All Members');

        hideLoading();
        showSuccess('All members downloaded successfully!');
    } catch (error) {
        hideLoading();
        showError('Failed to download: ' + error.message);
    }
}

// Enhanced download functions that check for active filters
async function downloadFilteredInstitutions() {
    showLoading();
    try {
        let institutionsToDownload;
        let filename;

        // Check if we have active institution search results
        if (currentInstitutionSearchResults.length > 0) {
            institutionsToDownload = currentInstitutionSearchResults;
            filename = `Filtered_Institutions_${new Date().toISOString().split('T')[0]}.xlsx`;
            showSuccess('Downloading filtered institutions...');
        } else if (currentAdminSearchResults.length > 0 && currentSearchType === 'institution') {
            institutionsToDownload = currentAdminSearchResults;
            filename = `Searched_Institutions_${new Date().toISOString().split('T')[0]}.xlsx`;
            showSuccess('Downloading searched institutions...');
        } else {
            // Fall back to all institutions
            const { data: institutions, error } = await supabase
                .from('institutions')
                .select('*')
                .order('institution_name');

            if (error) throw error;

            institutionsToDownload = institutions;
            filename = `All_Institutions_${new Date().toISOString().split('T')[0]}.xlsx`;
            showSuccess('Downloading all institutions...');
        }

        const formattedData = institutionsToDownload.map(formatInstitutionForDownload);
        downloadExcel(formattedData, filename, 'Institutions');

        hideLoading();

    } catch (error) {
        hideLoading();
        showError('Failed to download: ' + error.message);
    }
}

async function downloadFilteredMembers() {
    showLoading();
    try {
        let membersToDownload;
        let filename;

        // Check for active member search results
        if (currentMemberSearchResults.length > 0) {
            membersToDownload = currentMemberSearchResults;
            filename = `Filtered_Members_${new Date().toISOString().split('T')[0]}.xlsx`;
            showSuccess('Downloading filtered members...');
        }
        // Check for admin search results
        else if (currentAdminSearchResults.length > 0 && currentSearchType?.includes('member')) {
            membersToDownload = currentAdminSearchResults;
            filename = `Searched_Members_${new Date().toISOString().split('T')[0]}.xlsx`;
            showSuccess('Downloading searched members...');
        } else {
            // Fall back to all members
            const { data: members, error } = await supabase
                .from('members')
                .select('*, institutions(institution_name)')
                .order('full_name');

            if (error) throw error;

            membersToDownload = members;
            filename = `All_Members_${new Date().toISOString().split('T')[0]}.xlsx`;
            showSuccess('Downloading all members...');
        }

        const formattedData = membersToDownload.map(formatMemberForDownload);
        downloadExcel(formattedData, filename, 'Members');

        hideLoading();

    } catch (error) {
        hideLoading();
        showError('Failed to download: ' + error.message);
    }
}

function updateDownloadButtonLabels() {
    const institutionLabel = document.getElementById('institutionsDownloadLabel');
    const membersLabel = document.getElementById('membersDownloadLabel');

    if (institutionLabel) {
        const label = currentInstitutionSearchResults.length > 0 ? 'Filtered' : 'All';
        institutionLabel.textContent = label;
    }

    if (membersLabel) {
        let label = 'All';
        if (currentMemberSearchResults.length > 0) {
            label = 'Filtered';
        } else if (currentAdminSearchResults.length > 0 && currentSearchType?.includes('member')) {
            label = 'Searched';
        }
        membersLabel.textContent = label;
    }
}