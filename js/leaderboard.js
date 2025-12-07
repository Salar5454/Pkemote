// Leaderboard Page JavaScript
console.log('🏆 Leaderboard Page Initializing...');

// DOM Elements
const logoutBtn = document.getElementById('logoutBtn');

// Logout Handler
function handleLogout() {
    sessionStorage.removeItem('auth');
    window.location.href = 'index.html';
}

// Add event listener to logout button
logoutBtn?.addEventListener('click', handleLogout);

// Add modern interactions
function addLeaderboardInteractions() {
    // Add hover effects to leaderboard items
    const leaderboardItems = document.querySelectorAll('.leaderboard-item');
    leaderboardItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            item.style.transform = 'translateY(-3px)';
            item.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.transform = 'translateY(0)';
            item.style.boxShadow = 'none';
        });
    });
    
    // Add animation to stat cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        // Add delay for staggered animation
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('floatIn');
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    addLeaderboardInteractions();
    console.log('✅ Leaderboard Page Ready!');
});