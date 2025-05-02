import { useState, useEffect } from 'react'; // Only import necessary hooks
import blogsData from '../utils/blogs.js';
// Removed user import, userId will come from props

export default function BlogList({ initialUserId }) { // Accept initialUserId prop
  const [updatingState, setUpdatingState] = useState({});
  const [blogListState, setBlogListState] = useState(blogsData);
  const [permissions, setPermissions] = useState({ update: false, delete: false });
  // Internal state for the current user ID, initialized (e.g., to adminuser)
  const [currentUserId, setCurrentUserId] = useState(initialUserId || 'adminuser'); // Initialize with prop or fallback

  // Effect to listen for window events and update internal state
  useEffect(() => {
    const handleUserChange = (event) => {
      const newUserId = event.detail.userId;
      console.log(`BlogList: Received windowUserIdChange event with userId: ${newUserId}`);
      setCurrentUserId(newUserId);
    };

    window.addEventListener('windowUserIdChange', handleUserChange);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('windowUserIdChange', handleUserChange);
    };
  }, []); // Empty dependency array: run only once on mount

  // Effect to fetch permissions based on internal currentUserId state
  useEffect(() => {
    const fetchPermissions = async () => {
      // Use internal currentUserId state
      if (!currentUserId) {
        console.log("HermitAI: No currentUserId, setting default permissions.");
        setPermissions({ update: false, delete: false });
        return;
      }

      try {
        console.log(`HermitAI: Fetching permissions for currentUserId: ${currentUserId}`);
        const cacheBuster = Date.now();
        // Fetch update permission
        const updateRes = await fetch(`/api/getPermissions.json?id=${currentUserId}&operation=update&_=${cacheBuster}`);
        if (!updateRes.ok) throw new Error(`Update permission fetch failed: ${updateRes.status}`);
        const updateData = await updateRes.json();
        const canUpdate = updateData.status === "permitted";

        // Fetch delete permission
        const deleteRes = await fetch(`/api/getPermissions.json?id=${currentUserId}&operation=delete&_=${cacheBuster}`);
        if (!deleteRes.ok) throw new Error(`Delete permission fetch failed: ${deleteRes.status}`);
        const deleteData = await deleteRes.json();
        const canDelete = deleteData.status === "permitted";

        // Fetch ask permission
        const askRes = await fetch(`/api/getPermissions.json?id=${currentUserId}&operation=ask&_=${cacheBuster}`);
        if (!askRes.ok) throw new Error(`Ask permission fetch failed: ${askRes.status}`);
        const askData = await askRes.json();
        const canAsk = askData.status === "permitted";

        console.log(`HermitAI: Permissions received for ${currentUserId}: Update=${canUpdate}, Delete=${canDelete}, Ask=${canAsk}`);
        setPermissions({ update: canUpdate, delete: canDelete });
      } catch (error) {
        console.error(`HermitAI: Error fetching permissions for currentUserId ${currentUserId}:`, error);
        setPermissions({ update: false, delete: false });
      }
    };

    fetchPermissions();
  }, [currentUserId]); // Dependency array includes internal currentUserId

  // --- Modified Functions using fetched permissions ---

  async function editTodo(blog, newTitle) {
    // Check permission using state
    if (!permissions.update) {
        console.warn("Permission denied by Permit.io: Cannot update blog post.");
        alert("Permission Denied: You do not have permission to edit posts.");
        setUpdatingState({ isTrue: false });
        return;
    }
    // Proceed with update locally (no API call needed here for the action itself)
    setBlogListState((bloglist) =>
      bloglist.map((blogitem) => {
        if (blog.title === blogitem.title) {
          return { ...blogitem, title: newTitle }; // Create new object
        }
        return blogitem;
      })
    );
    setUpdatingState({ isTrue: false });
  }

  async function deleteTodo(blog) {
    // Check permission using state
     if (!permissions.delete) {
        console.warn("Permission denied by Permit.io: Cannot delete blog post.");
        alert("Permission Denied: You do not have permission to delete posts.");
        // No need to setDeletingState as it's removed
        return;
    }
    // Proceed with deletion locally
    setBlogListState((currentBlogList) =>
      currentBlogList.filter((bloginfo) => bloginfo.title !== blog.title)
    );
  }

  // --- JSX ---

  return (
    <>
      <h1 style={{ textAlign: 'center' }}>Blog Org</h1>
      {/* Use flexWrap: 'wrap' for responsiveness */}
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
        {blogListState.map((blog) => {
          // Generate a more robust key if possible, otherwise combine properties
          const key = blog.path || (blog.title + blog['created by']);

          return (
            // Use key prop on the outer element
            <section key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'left', justifyContent: 'space-between', width: '350px', minHeight: '400px', borderRadius: '5px', padding: '20px', backgroundColor: '#040406', color: 'white' }}>
              {/* Use object-fit and alt text */}
              <img src={blog.img} alt={blog.title || 'Blog post image'} height="200px" width="350px" style={{ objectFit: 'cover', borderRadius: '3px' }} />
              <section style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '15px', lineHeight: '1.4' }}>
                {/* Adjust heading style */}
                <h2 style={{ paddingLeft: '0px', margin: '0', fontSize: '1.4em', color: 'white' }}>
                  {/* Handle editing state */}
                  {updatingState.isTrue && updatingState.title === blog.title ? (
                    <>
                      {/* Use unique ID for input */}
                      <input
                        style={{ padding: '8px', marginRight: '5px', color: '#333' }}
                        id={`blogTitleInput-${key}`}
                        defaultValue={blog.title}
                        placeholder="Enter title"
                      />
                      {/* Save button */}
                      <button
                        style={{ padding: '8px 12px', cursor: 'pointer' }}
                        onClick={() => {
                          const inputElement = document.getElementById(`blogTitleInput-${key}`);
                          if (inputElement) {
                            editTodo(blog, inputElement.value);
                          }
                        }}
                      >
                        Save
                      </button>
                      {/* Cancel button */}
                      <button
                        style={{ padding: '8px 12px', cursor: 'pointer', marginLeft: '5px' }}
                        onClick={() => setUpdatingState({ isTrue: false })}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    blog.title // Display title
                  )}
                </h2>
                {/* Adjust span styles */}
                <span style={{ color: '#adA9B5', fontSize: '0.9em', paddingLeft: '0px' }}>
                  Written by {blog['created by']}
                </span>
                <span style={{ color: 'white', paddingLeft: '0px' }}>{blog.description}</span>
              </section>
              <section style={{ marginTop: '20px', display: 'flex', flexDirection: 'row', gap: '10px' }}>
                {/* Read Button - Always visible */}
                <span
                  onClick={() => {
                    // Use relative path for navigation within the site
                    window.location.href = blog.path;
                  }}
                  style={{ padding: '10px', backgroundColor: '#5a67d8', borderRadius: '5px', cursor: 'pointer', color: 'white' }}
                >
                  Read post
                </span>

                {/* Edit Button - Conditionally rendered based on fetched permissions */}
                {permissions.update && !updatingState.isTrue && (
                  <span
                    onClick={() => {
                      setUpdatingState({ isTrue: true, title: blog.title });
                    }}
                    style={{ padding: '10px', backgroundColor: '#343C9B', borderRadius: '5px', cursor: 'pointer', color: 'white' }}
                  >
                    Edit post
                  </span>
                )}
                 {/* Show "Editing..." text if currently editing this item */}
                 {updatingState.isTrue && updatingState.title === blog.title && (
                    <span style={{ padding: '10px', fontStyle: 'italic', color: '#ccc' }}>Editing...</span>
                 )}

                {/* Delete Button - Conditionally rendered based on fetched permissions */}
                {permissions.delete && (
                  <span
                    onClick={() => {
                      // Add confirmation dialog
                      if (window.confirm(`Are you sure you want to delete "${blog.title}"?`)) {
                        deleteTodo(blog);
                      }
                    }}
                    style={{ padding: '10px', backgroundColor: '#e53e3e', borderRadius: '5px', cursor: 'pointer', color: 'white' }}
                  >
                    Delete post {/* Simple button text */}
                  </span>
                )}
              </section>
            </section>
          );
        })}
      </section>
    </>
  );
}