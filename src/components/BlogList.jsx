import React, { useState, useEffect } from 'react';
import blogsData from '../utils/blogs.js';
import user from "../utils/user.json"; // Assuming user.json contains the user key

export default function BlogList() {
  const [updatingState, setUpdatingState] = useState({});
  const [deletingState, setDeletingState] = useState({ isTrue: false });
  const [blogListState, setBlogListState] = useState(blogsData);
  const [permissions, setPermissions] = useState({ update: false, delete: false }); // Store permissions

  // Fetch permissions when the component mounts or user changes (if applicable)
  // For simplicity, fetching once on mount. Could be refined based on auth flow.
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        // Fetch update permission
        const updateRes = await fetch(`/api/getPermissions.json?id=${user.key}&operation=update`);
        const updateData = await updateRes.json();
        const canUpdate = updateData.status === "permitted";

        // Fetch delete permission
        const deleteRes = await fetch(`/api/getPermissions.json?id=${user.key}&operation=delete`);
        const deleteData = await deleteRes.json();
        const canDelete = deleteData.status === "permitted";

        setPermissions({ update: canUpdate, delete: canDelete });
      } catch (error) {
        console.error("Error fetching permissions:", error);
        // Handle error state if needed
        setPermissions({ update: false, delete: false });
      }
    };

    fetchPermissions();
  }, []); // Empty dependency array: fetch permissions once on mount

  // --- Modified Functions using fetched permissions ---

  async function editTodo(blog, newTitle) {
    if (!permissions.update) {
        console.warn("Permission denied by Permit.io: Cannot update blog post.");
        alert("Permission Denied: You do not have permission to edit posts.");
        setUpdatingState({ isTrue: false });
        return;
    }
    // No need to call API again here, permission already checked on load
    setBlogListState((bloglist) =>
      bloglist.map((blogitem) => {
        if (blog.title === blogitem.title) {
          return { ...blogitem, title: newTitle };
        }
        return blogitem;
      })
    );
    setUpdatingState({ isTrue: false });
  }

  async function deleteTodo(blog) {
     if (!permissions.delete) {
        console.warn("Permission denied by Permit.io: Cannot delete blog post.");
        alert("Permission Denied: You do not have permission to delete posts.");
        setDeletingState({ isTrue: false }); // Reset deleting state if needed
        return;
    }
    // No need to call API again here, permission already checked on load
    setBlogListState((currentBlogList) =>
      currentBlogList.filter((bloginfo) => bloginfo.title !== blog.title)
    );
    // Optional: Reset deleting state if you were using it for UI feedback
    // setDeletingState({ isTrue: false });
  }

  // --- JSX ---

  return (
    <>
      <h1 style={{ textAlign: 'center' }}>Blog Org</h1>
      {/* Removed role display */}
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
        {blogListState.map((blog) => {
          const key = blog.title + blog['created by'];

          return (
            <section key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'left', justifyContent: 'space-between', width: '350px', minHeight: '400px', borderRadius: '5px', padding: '20px', backgroundColor: '#040406', color: 'white' }}>
              <img src={blog.img} alt={blog.title} height="200px" width="350px" style={{ objectFit: 'cover', borderRadius: '3px' }} />
              <section style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '15px', lineHeight: '1.4' }}>
                <h2 style={{ paddingLeft: '0px', margin: '0', fontSize: '1.4em' }}>
                  {updatingState.isTrue && updatingState.title === blog.title ? (
                    <>
                      <input
                        style={{ padding: '8px', marginRight: '5px', color: '#333' }}
                        id={`blogTitleInput-${key}`}
                        defaultValue={blog.title}
                        placeholder="Enter title"
                      />
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
                      <button
                        style={{ padding: '8px 12px', cursor: 'pointer', marginLeft: '5px' }}
                        onClick={() => setUpdatingState({ isTrue: false })}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    blog.title
                  )}
                </h2>
                <span style={{ color: '#adA9B5', fontSize: '0.9em', paddingLeft: '0px' }}>
                  Written by {blog['created by']}
                </span>
                <span style={{ paddingLeft: '0px' }}>{blog.description}</span>
              </section>
              <section style={{ marginTop: '20px', display: 'flex', flexDirection: 'row', gap: '10px' }}>
                {/* Read Button */}
                <span
                  onClick={() => {
                    // Assuming base path is handled by deployment or config
                    window.location.href = blog.path;
                  }}
                  style={{ padding: '10px', backgroundColor: '#5a67d8', borderRadius: '5px', cursor: 'pointer' }}
                >
                  Read post
                </span>

                {/* Edit Button - Conditionally rendered based on fetched permissions */}
                {permissions.update && !updatingState.isTrue && (
                  <span
                    onClick={() => {
                      setUpdatingState({ isTrue: true, title: blog.title });
                    }}
                    style={{ padding: '10px', backgroundColor: '#343C9B', borderRadius: '5px', cursor: 'pointer' }}
                  >
                    Edit post
                  </span>
                )}
                {updatingState.isTrue && updatingState.title === blog.title && (
                   <span style={{ padding: '10px', fontStyle: 'italic', color: '#ccc' }}>Editing...</span>
                )}

                {/* Delete Button - Conditionally rendered based on fetched permissions */}
                {permissions.delete && (
                  <span
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete "${blog.title}"?`)) {
                        // setDeletingState({ isTrue: true, title: blog.title }); // Optional UI feedback
                        deleteTodo(blog);
                      }
                    }}
                    style={{ padding: '10px', backgroundColor: '#e53e3e', borderRadius: '5px', cursor: 'pointer' }}
                  >
                    Delete post
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