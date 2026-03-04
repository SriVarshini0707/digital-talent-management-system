import { useEffect } from "react";
import axios from "axios";

function App() {

  useEffect(() => {
    axios.get("http://localhost:5000/")
      .then(res => console.log(res.data))
      .catch(err => console.log(err));
  }, []);

  return (
    <div>
      <h1>Digital Talent Management System</h1>
      <p>Check console for backend response</p>
    </div>
  );
}

export default App;