let currentInstitution = null;
let currentMembers = [];
let selectedMember = null;

async function initializeInstitutionDashboard() {
    showLoading();

    try {
        // Check authentication
        const session = await checkAuth();
        if (!session) return;

        // Verify user is an institution
        const userRole = localStorage.getItem('userRole');
        if (userRole !== 'institution') {
            throw new Error('Access denied. Institution access required.');
        }

        // Load institution data
        await loadInstitutionData();

        // Update welcome message
        document.getElementById('institutionWelcome').textContent = `Welcome, ${currentInstitution.institution_name}`;

        hideLoading();

    } catch (error) {
        hideLoading();
        showError(error.message);
        setTimeout(() => window.location.href = 'login.html', 2000);
    }
}

async function loadInstitutionData() {
    try {
        const userId = localStorage.getItem('userId');

        // Get institution profile
        const { data: institutionData, error: institutionError } = await supabase
            .from('institutions')
            .select('*')
            .eq('id', userId)
            .single();

        if (institutionError) throw institutionError;

        currentInstitution = institutionData;

        // Populate profile data
        populateInstitutionProfile(institutionData);

        // Load institution members
        await loadInstitutionMembers(institutionData.id);

        // Load works council and committee data
        await loadInstitutionWorksData(institutionData.id);

    } catch (error) {
        throw new Error('Failed to load institution data: ' + error.message);
    }
}

function populateInstitutionProfile(institutionData) {
    // Update stats
    document.getElementById('totalMembers').textContent = institutionData.total_members || 0;
    document.getElementById('totalWorksCouncil').textContent = institutionData.total_works_council || 0;
    document.getElementById('totalWorksCommittee').textContent = institutionData.total_works_committee || 0;

    // Update institution details
    document.getElementById('institutionId').textContent = institutionData.institution_id || '-';
    document.getElementById('institutionName').textContent = institutionData.institution_name || '-';
    document.getElementById('institutionEmail').textContent = institutionData.email || '-';
    document.getElementById('institutionLandline').textContent = institutionData.landline || '-';
    document.getElementById('institutionHead').textContent = institutionData.head_contact || '-';
    document.getElementById('institutionBursar').textContent = institutionData.bursar_contact || '-';

    // Populate update form
    document.getElementById('updateInstitutionName').value = institutionData.institution_name || '';
    document.getElementById('updateInstitutionEmail').value = institutionData.email || '';
    document.getElementById('updateInstitutionLandline').value = institutionData.landline || '';
    document.getElementById('updateInstitutionHead').value = institutionData.head_contact || '';
    document.getElementById('updateInstitutionBursar').value = institutionData.bursar_contact || '';
}

async function loadInstitutionMembers(institutionId) {
    try {
        const { data: members, error } = await supabase
            .from('members')
            .select('*')
            .eq('institution_id', institutionId)
            .order('full_name');

        if (error) throw error;

        currentMembers = members || [];
        displayMembersTable(currentMembers);

    } catch (error) {
        console.error('Error loading members:', error);
        showError('Failed to load member data');
    }
}

function displayMembersTable(members) {
    const tbody = document.getElementById('membersTableBody');

    if (members.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px; color: var(--secondary);">
                    No members found for this institution
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = members.map(member => `
        <tr>
            <td>${member.member_id}</td>
            <td>${member.full_name}</td>
            <td>${member.job_title || '-'}</td>
            <td>
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; 
                    background: ${getStatusColor(member.status)}; color: white;">
                    ${member.status || 'unknown'}
                </span>
            </td>
            <td>
                <button class="btn btn-primary" onclick="viewMemberProfile('${member.id}')" 
                        style="padding: 6px 12px; font-size: 0.8rem;">
                    View Profile
                </button>
            </td>
        </tr>
    `).join('');
}

function getStatusColor(status) {
    switch (status?.toLowerCase()) {
        case 'active': return '#10b981';
        case 'retired': return '#f59e0b';
        case 'unknown': return '#64748b';
        default: return '#64748b';
    }
}

async function loadInstitutionWorksData(institutionId) {
    try {
        // Load works council members with member details
        const { data: councilMembers, error: councilError } = await supabase
            .from('works_councils')
            .select(`
                rank,
                members (id, member_id, full_name)
            `)
            .eq('institution_id', institutionId);

        if (councilError) throw councilError;

        // Load works committee members with member details
        const { data: committeeMembers, error: committeeError } = await supabase
            .from('works_committees')
            .select(`
                rank,
                members (id, member_id, full_name)
            `)
            .eq('institution_id', institutionId);

        if (committeeError) throw committeeError;

        // Display works council data
        const councilContent = document.getElementById('institutionWorksCouncilContent');
        displayWorksData(councilContent, councilMembers, 'Works Council');

        // Display works committee data
        const committeeContent = document.getElementById('institutionWorksCommitteeContent');
        displayWorksData(committeeContent, committeeMembers, 'Works Committee');

    } catch (error) {
        console.error('Error loading works data:', error);
    }
}

function displayWorksData(container, members, type) {
    if (members && members.length > 0) {
        container.innerHTML = members.map(member => `
            <div class="info-card">
                <div class="info-row">
                    <span class="info-label">Name</span>
                    <span class="info-value">${member.members.full_name}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Member ID</span>
                    <span class="info-value">${member.members.member_id}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Rank</span>
                    <span class="info-value">${member.rank}</span>
                </div>
            </div>
        `).join('');
    } else {
        container.innerHTML = `
            <div class="info-card">
                <p style="text-align: center; color: var(--secondary);">
                    ${type} has not been set for this institution
                </p>
            </div>
        `;
    }
}

// Tab switching function
function switchTab(tabName, event) {
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

    if (tabName === 'manageWorks') {
        loadWorksManagement();
    }

    // Add active class to clicked tab (if event exists)
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // If called programmatically, find and activate the corresponding tab button
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            if (tab.getAttribute('onclick').includes(tabName)) {
                tab.classList.add('active');
            }
        });
    }
}


// Update institution profile form
document.getElementById('updateInstitutionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    showLoading();

    try {
        const updateData = {
            institution_name: document.getElementById('updateInstitutionName').value,
            email: document.getElementById('updateInstitutionEmail').value,
            landline: document.getElementById('updateInstitutionLandline').value,
            head_contact: document.getElementById('updateInstitutionHead').value,
            bursar_contact: document.getElementById('updateInstitutionBursar').value,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('institutions')
            .update(updateData)
            .eq('id', localStorage.getItem('userId'));

        if (error) throw error;

        hideLoading();
        showSuccess('Institution profile updated successfully!');

        // Reload institution data
        await loadInstitutionData();

        // Switch back to profile tab
        switchTab('profile');

    } catch (error) {
        hideLoading();
        showError('Failed to update institution profile: ' + error.message);
    }
});

// Member search functionality
document.getElementById('memberSearchForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('searchName').value;
    const grade = document.getElementById('searchGrade').value;
    const jobTitle = document.getElementById('searchJobTitle').value;

    await searchMembers(name, grade, jobTitle);
});

async function searchMembers(name, grade, jobTitle) {
    showLoading();

    try {
        let query = supabase
            .from('members')
            .select('*')
            .eq('institution_id', currentInstitution.id);

        // Add search filters
        if (name) {
            query = query.ilike('full_name', `%${name}%`);
        }
        if (grade) {
            query = query.ilike('grade', `%${grade}%`);
        }
        if (jobTitle) {
            query = query.ilike('job_title', `%${jobTitle}%`);
        }

        const { data: members, error } = await query;

        if (error) throw error;

        displaySearchResults(members || []);
        hideLoading();

    } catch (error) {
        hideLoading();
        showError('Search failed: ' + error.message);
    }
}

function displaySearchResults(members) {
    const tbody = document.getElementById('searchResultsBody');

    if (members.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 20px; color: var(--secondary);">
                    No members found matching your search criteria
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = members.map(member => `
        <tr>
            <td>${member.member_id}</td>
            <td>${member.full_name}</td>
            <td>${member.job_title || '-'}</td>
            <td>${member.grade || '-'}</td>
            <td>
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; 
                    background: ${getStatusColor(member.status)}; color: white;">
                    ${member.status || 'unknown'}
                </span>
            </td>
            <td>
                <button class="btn btn-primary" onclick="viewMemberProfile('${member.id}')" 
                        style="padding: 6px 12px; font-size: 0.8rem;">
                    View/Edit
                </button>
            </td>
        </tr>
    `).join('');
}

function clearSearch() {
    document.getElementById('searchName').value = '';
    document.getElementById('searchGrade').value = '';
    document.getElementById('searchJobTitle').value = '';
    document.getElementById('searchResultsBody').innerHTML = '';
}

// Member profile modal functions
async function viewMemberProfile(memberId) {
    showLoading();

    try {
        const { data: member, error } = await supabase
            .from('members')
            .select('*')
            .eq('id', memberId)
            .single();

        if (error) throw error;

        selectedMember = member;
        displayMemberModal(member);
        hideLoading();

    } catch (error) {
        hideLoading();
        showError('Failed to load member profile: ' + error.message);
    }
}

function displayMemberModal(member) {
    const modalContent = document.getElementById('memberModalContent');

    modalContent.innerHTML = `
        <form id="memberEditForm">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="form-group">
                    <label class="form-label">Member ID</label>
                    <input type="text" class="form-input" value="${member.member_id}" readonly 
                           style="background: #f5f5f5;">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Full Name</label>
                    <input type="text" class="form-input" id="modalFullName" value="${member.full_name || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">National ID</label>
                    <input type="text" class="form-input" id="modalNationalId" value="${member.national_id || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Date of Birth</label>
                    <input type="date" class="form-input" id="modalDob" value="${member.date_of_birth || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Gender</label>
                    <select class="form-select" id="modalGender">
                        <option value="">Select Gender</option>
                        <option value="Male" ${member.gender === 'Male' ? 'selected' : ''}>Male</option>
                        <option value="Female" ${member.gender === 'Female' ? 'selected' : ''}>Female</option>
                        <option value="Other" ${member.gender === 'Other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Job Title</label>
                    <input type="text" class="form-input" id="modalJobTitle" value="${member.job_title || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Date Joined</label>
                    <input type="date" class="form-input" id="modalDateJoined" value="${member.date_joined || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Grade</label>
                    <input type="text" class="form-input" id="modalGrade" value="${member.grade || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Contact Number</label>
                    <input type="tel" class="form-input" id="modalContact" value="${member.contact_number || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Status</label>
                    <select class="form-select" id="modalStatus">
                        <option value="active" ${member.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="unknown" ${member.status === 'unknown' ? 'selected' : ''}>Unknown</option>
                        <option value="retired" ${member.status === 'retired' ? 'selected' : ''}>Retired</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Position in Union</label>
                    <input type="text" class="form-input" id="modalPosition" value="${member.position_in_union || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Branch</label>
                    <select class="form-select" id="modalBranch">
                        <option value="">Select Branch</option>
                        <option value="Matabeleland North" ${member.branch === 'Matabeleland North' ? 'selected' : ''}>Matabeleland North</option>
                        <option value="Matabeleland South" ${member.branch === 'Matabeleland South' ? 'selected' : ''}>Matabeleland South</option>
                        <option value="Bulawayo" ${member.branch === 'Bulawayo' ? 'selected' : ''}>Bulawayo</option>
                    </select>
                </div>
            </div>
        </form>
    `;

    document.getElementById('memberModal').style.display = 'block';
}

function closeMemberModal() {
    document.getElementById('memberModal').style.display = 'none';
    selectedMember = null;
}

async function saveMemberChanges() {
    showLoading();

    try {
        const updateData = {
            full_name: document.getElementById('modalFullName').value,
            national_id: document.getElementById('modalNationalId').value,
            date_of_birth: document.getElementById('modalDob').value,
            gender: document.getElementById('modalGender').value,
            job_title: document.getElementById('modalJobTitle').value,
            date_joined: document.getElementById('modalDateJoined').value,
            grade: document.getElementById('modalGrade').value,
            contact_number: document.getElementById('modalContact').value,
            status: document.getElementById('modalStatus').value,
            position_in_union: document.getElementById('modalPosition').value,
            branch: document.getElementById('modalBranch').value,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('members')
            .update(updateData)
            .eq('id', selectedMember.id);

        if (error) throw error;

        hideLoading();
        showSuccess('Member profile updated successfully!');
        closeMemberModal();

        // Reload members data
        await loadInstitutionMembers(currentInstitution.id);

    } catch (error) {
        hideLoading();
        showError('Failed to update member profile: ' + error.message);
    }
}
// Add member functionality for institutions
document.getElementById('addNewMemberForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await addMemberAsInstitution();
});

async function addMemberAsInstitution() {
    showLoading();

    try {
        const memberData = {
            institution_id: currentInstitution.id,
            full_name: document.getElementById('newMemberNameInst').value,
            national_id: document.getElementById('newMemberNationalIdInst').value,
            date_of_birth: document.getElementById('newMemberDobInst').value,
            gender: document.getElementById('newMemberGenderInst').value,
            job_title: document.getElementById('newMemberJobTitleInst').value,
            date_joined: document.getElementById('newMemberDateJoinedInst').value,
            grade: document.getElementById('newMemberGradeInst').value,
            contact_number: document.getElementById('newMemberContactInst').value,
            position_in_union: document.getElementById('newMemberPositionInst').value,
            branch: document.getElementById('newMemberBranchInst').value,
            status: 'pending'
        };

        // Store the request in the database
        const { error } = await supabase
            .from('member_requests')
            .insert(memberData);

        if (error) throw error;

        hideLoading();
        showSuccess('Member request submitted successfully! The admin will assign a Member ID and create the account.');

        // Clear form
        document.getElementById('addNewMemberForm').reset();

        // Load pending requests
        await loadPendingRequests();

        // Send WhatsApp notification to admin
        const message = `New member request from ${currentInstitution.institution_name}:\n\n` +
            `Name: ${memberData.full_name}\n` +
            `Job Title: ${memberData.job_title}\n` +
            `Date Joined: ${memberData.date_joined}\n` +
            `Please check the admin dashboard to assign Member ID and approve.`;

        const whatsappUrl = `https://wa.me/263777217619?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');

    } catch (error) {
        hideLoading();
        showError('Failed to submit member request: ' + error.message);
    }
}

// Load institution's pending requests
async function loadPendingRequests() {
    try {
        const { data: requests, error } = await supabase
            .from('member_requests')
            .select('*')
            .eq('institution_id', currentInstitution.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;

        displayPendingRequests(requests || []);

    } catch (error) {
        console.error('Error loading pending requests:', error);
    }
}

function displayPendingRequests(requests) {
    const container = document.getElementById('pendingRequestsList');
    const section = document.getElementById('pendingRequests');

    if (requests.length === 0) {
        container.innerHTML = '<p>No pending requests.</p>';
        section.style.display = 'none';
        return;
    }

    container.innerHTML = requests.map(request => `
        <div class="info-card" style="margin-bottom: 12px; padding: 16px;">
            <h4>${request.full_name}</h4>
            <p><strong>Job Title:</strong> ${request.job_title} | <strong>Date Joined:</strong> ${request.date_joined}</p>
            <p><strong>Status:</strong> <span style="color: var(--warning);">Pending Admin Approval</span></p>
            <p><strong>Submitted:</strong> ${new Date(request.created_at).toLocaleDateString()}</p>
        </div>
    `).join('');

    section.style.display = 'block';
}

// Update the switchTab function to load pending requests
function switchTab(tabName, event) {
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

    // Add active class to clicked tab (if event exists)
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // If called programmatically, find and activate the corresponding tab button
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            if (tab.getAttribute('onclick').includes(tabName)) {
                tab.classList.add('active');
            }
        });
    }

    // Load data for specific tabs
    if (tabName === 'manageWorks') {
        loadWorksManagement();
    } else if (tabName === 'addMember') {
        loadPendingRequests();
    }
}

// Works Council & Committee Management
async function loadWorksManagement() {
    await populateMemberDropdowns();
    await loadCurrentWorksMembers();
}

async function populateMemberDropdowns() {
    const councilSelect = document.getElementById('worksCouncilMember');
    const committeeSelect = document.getElementById('worksCommitteeMember');

    // Clear existing options
    councilSelect.innerHTML = '<option value="">Select Member</option>';
    committeeSelect.innerHTML = '<option value="">Select Member</option>';

    // Add current institution members to dropdowns
    currentMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = `${member.full_name} (${member.member_id})`;

        councilSelect.appendChild(option.cloneNode(true));
        committeeSelect.appendChild(option);
    });
}

async function addToWorksCouncil() {
    const memberId = document.getElementById('worksCouncilMember').value;
    const rank = document.getElementById('worksCouncilRank').value;

    if (!memberId || !rank) {
        showError('Please select a member and enter a rank');
        return;
    }

    showLoading();

    try {
        const { error } = await supabase
            .from('works_councils')
            .insert({
                institution_id: currentInstitution.id,
                member_id: memberId,
                rank: rank
            });

        if (error) throw error;

        hideLoading();
        showSuccess('Member added to Works Council successfully!');

        // Clear form
        document.getElementById('worksCouncilRank').value = '';

        // Reload current works members
        await loadCurrentWorksMembers();

    } catch (error) {
        hideLoading();
        showError('Failed to add to Works Council: ' + error.message);
    }
}

async function addToWorksCommittee() {
    const memberId = document.getElementById('worksCommitteeMember').value;
    const rank = document.getElementById('worksCommitteeRank').value;

    if (!memberId || !rank) {
        showError('Please select a member and enter a rank');
        return;
    }

    showLoading();

    try {
        const { error } = await supabase
            .from('works_committees')
            .insert({
                institution_id: currentInstitution.id,
                member_id: memberId,
                rank: rank
            });

        if (error) throw error;

        hideLoading();
        showSuccess('Member added to Works Committee successfully!');

        // Clear form
        document.getElementById('worksCommitteeRank').value = '';

        // Reload current works members
        await loadCurrentWorksMembers();

    } catch (error) {
        hideLoading();
        showError('Failed to add to Works Committee: ' + error.message);
    }
}

async function loadCurrentWorksMembers() {
    try {
        // Load current works council members
        const { data: councilMembers, error: councilError } = await supabase
            .from('works_councils')
            .select(`
                id, rank,
                members (id, member_id, full_name)
            `)
            .eq('institution_id', currentInstitution.id);

        if (councilError) throw councilError;

        // Load current works committee members
        const { data: committeeMembers, error: committeeError } = await supabase
            .from('works_committees')
            .select(`
                id, rank,
                members (id, member_id, full_name)
            `)
            .eq('institution_id', currentInstitution.id);

        if (committeeError) throw committeeError;

        // Display current works council
        const councilContainer = document.getElementById('currentWorksCouncil');
        councilContainer.innerHTML = `
            <h4>Current Works Council Members</h4>
            ${councilMembers && councilMembers.length > 0 ?
                councilMembers.map(member => `
                    <div class="info-card" style="margin-bottom: 8px; padding: 12px;">
                        <strong>${member.members.full_name}</strong> (${member.members.member_id})
                        <br><em>${member.rank}</em>
                        <button class="btn" style="background: var(--error); color: white; padding: 4px 8px; margin-left: 8px; float: right;" 
                                onclick="removeFromWorksCouncil('${member.id}')">
                            Remove
                        </button>
                    </div>
                `).join('') :
                '<p>No Works Council members yet.</p>'
            }
        `;

        // Display current works committee
        const committeeContainer = document.getElementById('currentWorksCommittee');
        committeeContainer.innerHTML = `
            <h4>Current Works Committee Members</h4>
            ${committeeMembers && committeeMembers.length > 0 ?
                committeeMembers.map(member => `
                    <div class="info-card" style="margin-bottom: 8px; padding: 12px;">
                        <strong>${member.members.full_name}</strong> (${member.members.member_id})
                        <br><em>${member.rank}</em>
                        <button class="btn" style="background: var(--error); color: white; padding: 4px 8px; margin-left: 8px; float: right;" 
                                onclick="removeFromWorksCommittee('${member.id}')">
                            Remove
                        </button>
                    </div>
                `).join('') :
                '<p>No Works Committee members yet.</p>'
            }
        `;

    } catch (error) {
        console.error('Error loading works members:', error);
    }
}

async function removeFromWorksCouncil(worksCouncilId) {
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

        await loadCurrentWorksMembers();

    } catch (error) {
        hideLoading();
        showError('Failed to remove member: ' + error.message);
    }
}

async function removeFromWorksCommittee(worksCommitteeId) {
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

        await loadCurrentWorksMembers();

    } catch (error) {
        hideLoading();
        showError('Failed to remove member: ' + error.message);
    }
}


// Request member deletion via WhatsApp
function requestMemberDelete() {
    if (!selectedMember) return;

    const message = `Hi, ZEHSSCWU. THIS IS ${currentInstitution.institution_name}. I would like to request to delete the profile for ${selectedMember.full_name} (${selectedMember.member_id})`;
    const whatsappUrl = `https://wa.me/263777217619?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// Log payment function
function logPayment() {
    // Replace with your actual Google Form URL
    const googleFormUrl = 'https://docs.google.com/forms/d/your-form-id-here';
    window.open(googleFormUrl, '_blank');
}

// Union tools navigation
function visitInstitutionTool(toolName) {
    const toolUrls = {
        'bulk-dues-calculator': '#',
        'member-reports': '#',
        'meeting-management': '#',
        'payment-tracking': '#'
    };

    const url = toolUrls[toolName];
    if (url && url !== '#') {
        window.open(url, '_blank');
    } else {
        showError('This tool is not yet available. Please check back later.');
    }
}

// Contact support function
function contactInstitutionSupport() {
    const institutionName = currentInstitution ? currentInstitution.institution_name : 'Unknown Institution';
    const message = `Hi, ZEHSSCWU. My institution is ${institutionName}. I would like assistance with ---`;
    const whatsappUrl = `https://wa.me/263777217619?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}