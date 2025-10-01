export const applyTheme = (theme) => {
  const root = document.documentElement;

  if (theme === 'dark') {
    root.style.setProperty('--bg-color', '#1a1a1a');
    root.style.setProperty('--text-color', '#ffffff');
    root.style.setProperty('--input-bg', '#2b2b2b');
    root.style.setProperty('--border-color', '#444');
    root.style.setProperty('--primary-color', '#02332fff');
    root.style.setProperty('--hover-color', '#023f10ff');
  } else {
    root.style.setProperty('--bg-color', '#ffffff');
    root.style.setProperty('--text-color', '#000000');
    root.style.setProperty('--input-bg', '#f0f0f0');
    root.style.setProperty('--border-color', '#ccc');
    root.style.setProperty('--primary-color', '#007bff');
    root.style.setProperty('--hover-color', '#0056b3');
  }
};
