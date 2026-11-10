const textarea = document.getElementById('users');
const status = document.getElementById('status');

chrome.storage.sync.get({ users: [] }, ({ users }) => {
  textarea.value = users.join('\n');
});

document.getElementById('save').addEventListener('click', () => {
  const users = [...new Set(textarea.value.split('\n').map((s) => s.trim()).filter(Boolean))];
  chrome.storage.sync.set({ users }, () => {
    textarea.value = users.join('\n');
    status.textContent = `Saved ${users.length} user${users.length === 1 ? '' : 's'}.`;
    setTimeout(() => (status.textContent = ''), 2000);
  });
});
