import { useNavigate } from "react-router-dom";
import "../VisitorValidation/VisitorValidation.css";

function PhotoSaved() {
  const navigate = useNavigate();

  return (
    <div className="validation-dashboard">
      <div className="visitor-log-header">
        <div>
          <h3>Photo Saved</h3>
          <p className="subheading">Face capture was successful. Continue to visitor validation to review and approve or reject the visitor.</p>
        </div>

        <div className="top-controls">
          <button type="button" className="btn btn-primary" onClick={() => navigate("/visitor-validation")}>Go to Validation</button>
          <button type="button" className="btn btn-outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
        </div>
      </div>
    </div>
  );
}

export default PhotoSaved;
