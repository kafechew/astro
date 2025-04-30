import {useState , useEffect} from 'react';
import blogsData from '../utils/blogs.js';
import user from "../utils/user.json";

export default function BlogList(){

    useEffect(() => {
      localStorage.setItem("blogData" , blogsData);
    });

    const [updatingState , setUpdatingState] = useState({});
    const [deletingState , setDeletingState] = useState({isTrue : false});
    const [blogListState , setBlogListState] = useState(blogsData);
    
    useEffect(() => {

      localStorage.setItem("blogData" , blogListState);

    } , [blogListState]);
        

    async function editTodo(blog , newTitle){
        
        const res = await fetch(`http://localhost:4321/api/getPermissions.json?id=${user.key}&operation=update`)
        
        const response = await res.json();
        if(response.status === "permitted"){
          
            setBlogListState((bloglist) => bloglist.map((blogitem) => {
                if(blog.title === blogitem.title){
                  blogitem.title = newTitle;
                }

                return blogitem;
            }))
            
          
        }

        setUpdatingState({isTrue : false});
    } 


    async function deleteTodo(blog){
        
        const res = await fetch(`http://localhost:4321/api/getPermissions.json?id=${user.key}&operation=delete`)
        
        const response = await res.json();

        if(response.status === "permitted"){
          
          setBlogListState((blogListState) => blogListState.filter((bloginfo) => bloginfo.title !== blog.title));
          
        }

        setDeletingState({isTrue : false})
    }
    
    return(
      <>
        <h1 style={{textAlign : "center"}}>Blog Org</h1>
        <section style={{display:"flex" , flexDirection: "row" , gap : "20px" , justifyContent : "center"}}>
            {blogListState.map((blog) => {
              
              return (
              <section  style={{display:"flex" , flexDirection: "column" , alignItems : "left" , justifyContent: 'space-evenly' , width : "350px", minHeight : "400px" , borderRadius: "5px" , padding: "20px" , backgroundColor : "#040406"}}>
                  <img src={blog.img} alt={blog.img} height="200px" width="350px"/>
                  <section style={{display : "flex" , flexDirection : "column" , gap : "20px" , paddingTop : "20px" , lineHeight : "32px"}}>
 
                    <h2 style={{color: "white" , paddingLeft : "20px" , margin : "0" ,}}>
                      {updatingState.isTrue && updatingState.title === blog.title ? 
                        <>
                          <input style={{padding : "10px"}} id='blogTitleInput' placeholder='enter title ' />
                          <button style={{padding : "10px"}} 
                            onClick={() =>{
                                editTodo(blog , document.getElementById("blogTitleInput").value);
                            }}
                          >done</button>
                        </>
                        
                          :
                        
                         blog.title
                      
                      }
                    </h2>
                    <span style={{color: "#adA9B5" , fontSize : "13px" , paddingLeft :"20px"}}>written by {blog['created by']}</span>
                    <span style={{color : "white" , paddingLeft : "20px"}}>{blog.description}</span>
            
                  </section>
                  <section style={{margin : "10px" , marginTop : '20px' , display : "flex" , flexDirection : "row" , gap: "10px" }}>

                    <span 
                    
                    onClick={() => {
                        window.location = blog.path
                    }}

                    style={{
                      padding : "10px",
                      backgroundColor: "#343C9B"
                      , borderRadius : "5px"
                    }}>
                        Read post
                      </span>
                      <span 
                      
                      onClick={() => {

                        setUpdatingState({isTrue : true , title : blog.title})

                      }}

                      style={{
                      padding : "10px",
                      backgroundColor: "#343C9B", 
                      borderRadius : "5px"
                      }}
                      >
                        {updatingState.isTrue && updatingState.title === blog.title ? "edting" : "Edit post"}
                      </span>
                      <span 
                      
                      onClick={() => {
                          setDeletingState({isTrue : true , title : blog.title})
                          deleteTodo(blog)
                      }}

                      style={{
                      padding : "10px",
                      backgroundColor: "#343C9B", 
                      borderRadius : "5px"
                      }}
                      >
                        { deletingState.isTrue && deletingState.title === blog.title ? "deleting .." : "Delete post"}
                      </span>
                  </section>
              </section>
              )
            })}
        </section>
       </>  
    )
}