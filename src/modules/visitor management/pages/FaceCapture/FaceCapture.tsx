import CameraCapture from "./CameraCapture";

function FaceCapture() {
  return (
    <div className="page-stack">
      {/* <div className="page-header"> */}
        {/* <div className="page-title">
          <h1>Face Registration</h1>
          <p className="page-description">Capture or upload a visitor photo for verification and check-in validation.</p>
        </div> */}
      {/* </div> */}

      <CameraCapture />
    </div>
  );
}

export default FaceCapture;
