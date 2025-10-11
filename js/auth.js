// Authentication functions
async function handleLogin(userType, username, password) {
    showLoading();

    try {
        let email;

        // Construct email based on user type
        switch (userType) {
            case 'member':
                email = `${username}@zehsscwu.org`;
                break;
            case 'institution':
                email = `${username}@zehsscwu.org`;  // Simple format
                break;
            case 'admin':
                email = username;  // Admin uses full email
                break;
            default:
                throw new Error('Please select a user type');
        }

        // Authenticate with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        // Verify user role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

        if (profileError) throw profileError;

        if (profile.role !== userType) {
            throw new Error('Access denied for this user type');
        }

        // Store user session
        localStorage.setItem('userRole', userType);
        localStorage.setItem('userId', data.user.id);

        // Redirect based on role
        switch (userType) {
            case 'member':
                window.location.href = 'member.html';
                break;
            case 'institution':
                window.location.href = 'institution.html';
                break;
            case 'admin':
                window.location.href = 'admin.html';
                break;
        }

    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

// Check if user is logged in
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = 'login.html';
        return null;
    }

    return session;
}

// Logout function
async function logout() {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = 'login.html';
}