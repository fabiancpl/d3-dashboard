document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.tab-button');
  const contents = document.querySelectorAll('.tab-content');

  buttons.forEach(button => button.addEventListener('click', () => {
    // Update button active states
    buttons.forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    
    // Update content visibility
    contents.forEach(c => c.classList.remove('active'));
    const activeContent = document.getElementById(button.dataset.tab);
    activeContent.classList.add('active');
    
    // Trigger resize event for charts
    window.dispatchEvent(new Event('resize'));
  }));
});
