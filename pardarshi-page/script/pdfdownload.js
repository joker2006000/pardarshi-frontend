// ==========================================
// DOWNLOAD CONTRIBUTIONS PDF
// ==========================================
window.downloadContributionsPDF = function (event) {
    const btn = event.currentTarget || document.activeElement;
    const originalText = btn.innerHTML;
    
    // 1. Show loading state
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Generating...`;

    setTimeout(() => {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            const filtered = filterByDate(allContributions, 'created_at', currentContribFilter);
            if (!filtered.length) {
                alert("No contributions available to download for this time period.");
                btn.disabled = false;
                btn.innerHTML = originalText;
                return;
            }

            // --- HEADER INFO ---
            const orgName = localStorage.getItem('currentOrgName') || 'Organization Statement';
            let projectName = document.getElementById('dropdown-selected-label').textContent.trim();
            projectName = projectName.replace('Projects: ', ''); // Clean up the label
            
            // Get current totals directly from the UI
            const totalRec = document.getElementById('stat-total-fund').textContent;
            const totalExp = document.getElementById('stat-total-expense').textContent;
            const totalBal = document.getElementById('stat-remaining').textContent;

            // "BY PARDARSHI" Label (Top Right)
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text("BY PARDARSHI", 195, 12, { align: "right" });

            // Organization Name (Centered)
            doc.setFontSize(16);
            doc.setTextColor(17, 24, 39);
            doc.text(orgName.toUpperCase(), 105, 18, { align: "center" });

            // Document Type & Project
            doc.setFontSize(14);
            doc.setTextColor(37, 99, 235); // Blue color for Contributions
            doc.text("Type: Contributions", 14, 28);
            
            doc.setFontSize(10);
            doc.setTextColor(107, 114, 128);
            doc.text(`Project: ${projectName}`, 14, 34);
            doc.text(`Time Period: ${currentContribFilter.toUpperCase()}`, 14, 39);

            // Totals Bar
            doc.setFontSize(10);
            doc.setTextColor(17, 24, 39);
            doc.text(`Total Received: ${totalRec}    |    Total Expenses: ${totalExp}    |    Remaining Balance: ${totalBal}`, 14, 47);

            // --- TABLE DATA ---
            let totalAmt = 0;
            const tableData = filtered.map((c, i) => {
                const amt = Number(c.amount) || 0;
                totalAmt += amt;
                
                // Logic for Offline/Online and Mobile Fallback
                const isOffline = c.payment_method === 'offline' || c.payment_gateway === 'offline';
                const mobileStr = (c.contributor_mobile && c.contributor_mobile.trim() !== '') ? c.contributor_mobile : 'Not Available';
                
                return [
                    i + 1,
                    c.contributor_name || 'Anonymous',
                    mobileStr,
                    isOffline ? 'Offline' : 'Online',
                    formatDateTime(c.created_at),
                    `Rs. ${formatNum(amt)}`
                ];
            });

            // Add final sum row
            tableData.push(['', '', '', '', 'Total:', `Rs. ${formatNum(totalAmt)}`]);

            // --- RENDER TABLE ---
            doc.autoTable({
                startY: 52,
                head: [['#', 'Contributor Name', 'Mobile', 'Status', 'Date & Time', 'Amount']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [37, 99, 235] }, // Blue Header
                styles: { fontSize: 8, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 10 },
                    5: { halign: 'right', fontStyle: 'bold' }
                }
            });

            doc.save(`Contributions_${currentContribFilter}_${Date.now()}.pdf`);
        } catch (err) {
            console.error("PDF Error:", err);
            alert("Error generating PDF.");
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }, 50);
};

// ==========================================
// DOWNLOAD EXPENSES PDF
// ==========================================
window.downloadExpensesPDF = function (event) {
    const btn = event.currentTarget || document.activeElement;
    const originalText = btn.innerHTML;
    
    // 1. Show loading state
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Generating...`;

    setTimeout(() => {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            const filtered = filterByDate(allExpenses, 'expense_date', currentExpenseFilter);
            if (!filtered.length) {
                alert("No expenses available to download for this time period.");
                btn.disabled = false;
                btn.innerHTML = originalText;
                return;
            }

            // --- HEADER INFO ---
            const orgName = localStorage.getItem('currentOrgName') || 'Organization Statement';
            let projectName = document.getElementById('dropdown-selected-label').textContent.trim();
            projectName = projectName.replace('Projects: ', ''); 
            
            const totalRec = document.getElementById('stat-total-fund').textContent;
            const totalExp = document.getElementById('stat-total-expense').textContent;
            const totalBal = document.getElementById('stat-remaining').textContent;

            // "BY PARDARSHI" Label (Top Right)
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text("BY PARDARSHI", 195, 12, { align: "right" });

            // Organization Name (Centered)
            doc.setFontSize(16);
            doc.setTextColor(17, 24, 39);
            doc.text(orgName.toUpperCase(), 105, 18, { align: "center" });

            // Document Type & Project
            doc.setFontSize(14);
            doc.setTextColor(239, 68, 68); // Red color for Expenses
            doc.text("Type: Expenses", 14, 28);
            
            doc.setFontSize(10);
            doc.setTextColor(107, 114, 128);
            doc.text(`Project: ${projectName}`, 14, 34);
            doc.text(`Time Period: ${currentExpenseFilter.toUpperCase()}`, 14, 39);

            // Totals Bar
            doc.setFontSize(10);
            doc.setTextColor(17, 24, 39);
            doc.text(`Total Received: ${totalRec}    |    Total Expenses: ${totalExp}    |    Remaining Balance: ${totalBal}`, 14, 47);

            // --- TABLE DATA ---
            let totalAmt = 0;
            const tableData = filtered.map((e, i) => {
                const amt = Number(e.amount) || 0;
                totalAmt += amt;
                const isOffline = e.payment_method === 'offline' || !e.is_online_payment;
                
                return [
                    i + 1,
                    e.title || 'Expense',
                    e.creator_name || 'Admin', // Expenses use Reporter instead of Mobile
                    isOffline ? 'Offline' : 'Online',
                    formatDateTime(e.expense_date || e.created_at),
                    `Rs. ${formatNum(amt)}`
                ];
            });

            tableData.push(['', '', '', '', 'Total:', `Rs. ${formatNum(totalAmt)}`]);

            // --- RENDER TABLE ---
            doc.autoTable({
                startY: 52,
                head: [['#', 'Expense Title', 'Reported By', 'Status', 'Date & Time', 'Amount']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [239, 68, 68] }, // Red Header
                styles: { fontSize: 8, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 10 },
                    5: { halign: 'right', fontStyle: 'bold' }
                }
            });

            doc.save(`Expenses_${currentExpenseFilter}_${Date.now()}.pdf`);
        } catch (err) {
            console.error("PDF Error:", err);
            alert("Error generating PDF.");
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }, 50);
};