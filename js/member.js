let currentMember = null;

async function initializeMemberDashboard() {
    showLoading();

    try {
        // Check authentication
        const session = await checkAuth();
        if (!session) return;

        // Verify user is a member
        const userRole = localStorage.getItem('userRole');
        if (userRole !== 'member') {
            throw new Error('Access denied. Member access required.');
        }

        // Load member data
        await loadMemberData();

        // Update welcome message
        document.getElementById('memberWelcome').textContent = `Welcome, ${currentMember.full_name}`;

        hideLoading();

    } catch (error) {
        hideLoading();
        showError(error.message);
        setTimeout(() => window.location.href = 'login.html', 2000);
    }
}

async function loadMemberData() {
    try {
        const userId = localStorage.getItem('userId');

        // Get member profile with institution details
        const { data: memberData, error: memberError } = await supabase
            .from('members')
            .select(`
                *,
                institutions (institution_name)
            `)
            .eq('id', userId)
            .single();

        if (memberError) throw memberError;

        currentMember = memberData;

        // Populate profile tab
        populateProfileData(memberData);

        // Populate update form
        populateUpdateForm(memberData);

        // Load works council and committee data
        await loadWorksData(memberData.institution_id);

    } catch (error) {
        throw new Error('Failed to load member data: ' + error.message);
    }
}

function populateProfileData(memberData) {
    document.getElementById('profileMemberId').textContent = memberData.member_id || '-';
    document.getElementById('profileFullName').textContent = memberData.full_name || '-';
    document.getElementById('profileInstitution').textContent = memberData.institutions?.institution_name || '-';
    document.getElementById('profileNationalId').textContent = memberData.national_id || '-';
    document.getElementById('profileDob').textContent = formatDate(memberData.date_of_birth);
    document.getElementById('profileGender').textContent = memberData.gender || '-';
    document.getElementById('profileJobTitle').textContent = memberData.job_title || '-';
    document.getElementById('profileDateJoined').textContent = formatDate(memberData.date_joined);
    document.getElementById('profileGrade').textContent = memberData.grade || '-';
    document.getElementById('profileContact').textContent = memberData.contact_number || '-';
    document.getElementById('profileStatus').textContent = memberData.status || '-';
    document.getElementById('profilePosition').textContent = memberData.position_in_union || '-';
    document.getElementById('profileBranch').textContent = memberData.branch || '-';
}

function populateUpdateForm(memberData) {
    document.getElementById('updateFullName').value = memberData.full_name || '';
    document.getElementById('updateNationalId').value = memberData.national_id || '';
    document.getElementById('updateDob').value = memberData.date_of_birth || '';
    document.getElementById('updateGender').value = memberData.gender || '';
    document.getElementById('updateJobTitle').value = memberData.job_title || '';
    document.getElementById('updateDateJoined').value = memberData.date_joined || '';
    document.getElementById('updateGrade').value = memberData.grade || '';
    document.getElementById('updateContact').value = memberData.contact_number || '';
    document.getElementById('updatePosition').value = memberData.position_in_union || '';
    document.getElementById('updateBranch').value = memberData.branch || '';
}

async function loadWorksData(institutionId) {
    try {
        // Load works council members
        const { data: councilMembers, error: councilError } = await supabase
            .from('works_councils')
            .select(`
                rank,
                members (member_id, full_name)
            `)
            .eq('institution_id', institutionId);

        if (councilError) throw councilError;

        // Load works committee members
        const { data: committeeMembers, error: committeeError } = await supabase
            .from('works_committees')
            .select(`
                rank,
                members (member_id, full_name)
            `)
            .eq('institution_id', institutionId);

        if (committeeError) throw committeeError;

        // Display works council data
        const councilContent = document.getElementById('worksCouncilContent');
        if (councilMembers && councilMembers.length > 0) {
            councilContent.innerHTML = councilMembers.map(member => `
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
            councilContent.innerHTML = `
                <div class="info-card">
                    <p style="text-align: center; color: var(--secondary);">
                        Works Council has not been set for this institution
                    </p>
                </div>
            `;
        }

        // Display works committee data
        const committeeContent = document.getElementById('worksCommitteeContent');
        if (committeeMembers && committeeMembers.length > 0) {
            committeeContent.innerHTML = committeeMembers.map(member => `
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
            committeeContent.innerHTML = `
                <div class="info-card">
                    <p style="text-align: center; color: var(--secondary);">
                        Works Committee has not been set for this institution
                    </p>
                </div>
            `;
        }

    } catch (error) {
        console.error('Error loading works data:', error);
    }
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
}

// Update profile form submission
document.getElementById('updateProfileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    showLoading();

    try {
        const updateData = {
            full_name: document.getElementById('updateFullName').value,
            national_id: document.getElementById('updateNationalId').value,
            date_of_birth: document.getElementById('updateDob').value,
            gender: document.getElementById('updateGender').value,
            job_title: document.getElementById('updateJobTitle').value,
            date_joined: document.getElementById('updateDateJoined').value,
            grade: document.getElementById('updateGrade').value,
            contact_number: document.getElementById('updateContact').value,
            branch: document.getElementById('updateBranch').value,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('members')
            .update(updateData)
            .eq('id', localStorage.getItem('userId'));

        if (error) throw error;

        hideLoading();
        showSuccess('Profile updated successfully!');

        // Reload member data to reflect changes
        await loadMemberData();

        // Switch back to profile tab
        switchTab('profile');

    } catch (error) {
        hideLoading();
        showError('Failed to update profile: ' + error.message);
    }
});

// Union tools navigation
function visitTool(toolName) {
    // Placeholder for tool links - you'll add actual URLs later
    const toolUrls = {
        'dues-calculator': '#',
        'grievance-reporting': '#',
        'training-portal': '#',
        'meeting-scheduler': '#'
    };

    const url = toolUrls[toolName];
    if (url && url !== '#') {
        window.open(url, '_blank');
    } else {
        showError('This tool is not yet available. Please check back later.');
    }
}

// Contact support function
function contactSupport() {
    const memberId = currentMember ? currentMember.member_id : 'Unknown';
    const message = `Hi, ZEHSSCWU. My member ID is ${memberId}. I would like assistance with ---`;
    const whatsappUrl = `https://wa.me/263777217619?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}
