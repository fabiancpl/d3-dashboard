document.addEventListener('DOMContentLoaded', () => {
const buttons = document.querySelectorAll('.tab-button');
  const contents = document.querySelectorAll('.tab-content');
  // Initialize tab states
  contents.forEach(c => {
    if (c.classList.contains('active')) {
      c.style.display = c.id === 'tab1' ? 'flex' : 'block';
    } else {
      c.style.display = 'none';
    }
  });

  buttons.forEach(button => button.addEventListener('click', () => {
    // Update button active states
    buttons.forEach(b => b.classList.remove('active'));
    button.classList.add('active');
      // Update content visibility
    contents.forEach(c => {
      c.classList.remove('active');
      c.style.display = 'none';
    });
    const activeContent = document.getElementById(button.dataset.tab);
    activeContent.classList.add('active');
    activeContent.style.display = 'flex';
  }));
});
