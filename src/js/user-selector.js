// src/js/user-selector.js
export function setupUserSelector() {
  const userIdSelect = document.getElementById('userId');

  // Check if the element exists and is an HTMLSelectElement
  if (userIdSelect instanceof HTMLSelectElement) {
    userIdSelect.addEventListener('change', () => {
      const selectedUserId = userIdSelect.value; // Now type-safe
      console.log(`UserSelector: User ID changed to ${selectedUserId}. Dispatching event.`); // Log for debugging
      // Dispatch a custom event that bubbles up
      userIdSelect.dispatchEvent(new CustomEvent('useridchange', {
        detail: { userId: selectedUserId },
        bubbles: true,
        composed: true // Allows event to cross shadow DOM boundaries if needed
      }));
    });
  } else if (userIdSelect) {
    console.warn("UserSelector: Found element with ID 'userId', but it is not an HTMLSelectElement.");
  } else {
    console.warn("UserSelector: Could not find element with ID 'userId'.");
  }
}