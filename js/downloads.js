// downloads.js - Utility functions for downloading data

// Download as CSV
function downloadCSV(data, filename) {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Download as Excel (using SheetJS)
function downloadExcel(data, filename, sheetName = 'Sheet1') {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
}

// Download multiple sheets as Excel
function downloadExcelMultiSheet(sheets, filename) {
    const wb = XLSX.utils.book_new();

    sheets.forEach(sheet => {
        const ws = XLSX.utils.json_to_sheet(sheet.data);
        XLSX.utils.book_append_sheet(wb, ws, sheet.name);
    });

    XLSX.writeFile(wb, filename);
}

// Format institution data for download
function formatInstitutionForDownload(institution) {
    return {
        'Institution ID': institution.institution_id,
        'Institution Name': institution.institution_name,
        'Email': institution.email || '-',
        'Landline': institution.landline || '-',
        'Head Contact': institution.head_contact || '-',
        'Bursar Contact': institution.bursar_contact || '-',
        'Branch': institution.branch || '-',
        'Total Members': institution.total_members || 0,
        'Works Council Members': institution.total_works_council || 0,
        'Works Committee Members': institution.total_works_committee || 0
    };
}

// Format member data for download
function formatMemberForDownload(member) {
    return {
        'Member ID': member.member_id,
        'Full Name': member.full_name,
        'Institution': member.institutions?.institution_name || '-',
        'National ID': member.national_id || '-',
        'Date of Birth': member.date_of_birth || '-',
        'Gender': member.gender || '-',
        'Job Title': member.job_title || '-',
        'Date Joined': member.date_joined || '-',
        'Grade': member.grade || '-',
        'Contact Number': member.contact_number || '-',
        'Position in Union': member.position_in_union || '-',
        'Branch': member.branch || '-',
        'Status': member.status || '-'
    };
}

// Format works council/committee for download
function formatWorksForDownload(worksData, type) {
    return worksData.map(item => ({
        'Type': type,
        'Member ID': item.members?.member_id || '-',
        'Member Name': item.members?.full_name || '-',
        'Rank/Position': item.rank || '-',
        'Institution': item.institutions?.institution_name || '-'
    }));
}