import { useNavigate } from "react-router-dom";
import "../VisitorValidation/VisitorValidation.css";

function VisitorDetailsSaved() {
  const navigate = useNavigate();

  return (
    <div className="validation-dashboard">
      <div className="visitor-log-header">
        <div>
          <h3>Visitor Details Saved</h3>
          <p className="subheading">Visitor details have been recorded successfully. Move on to face capture to complete the flow.</p>
        </div>

        <div className="top-controls">
          <button type="button" className="btn btn-primary" onClick={() => navigate("/face-capture")}>Proceed to Face Capture</button>
          <button type="button" className="btn btn-outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
        </div>
      </div>
    </div>
  );
}

export default VisitorDetailsSaved;
