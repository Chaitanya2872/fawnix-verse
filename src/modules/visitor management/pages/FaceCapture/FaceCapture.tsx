import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, VmsPage } from "../../components/vms/VmsPage";
import { useVisitor } from "../../hooks/useVisitors";
import { VMS_PATHS } from "../../routes/paths";
import CameraCapture from "./CameraCapture";

function FaceCapture() {
  const { id } = useParams();
  const { visitor, loading, error } = useVisitor(id);

  return (
    <VmsPage
      title="Face Registration"
      description="Capture guided face angles for identity verification at the security desk."
      actions={
        <Button asChild variant="outline">
          <Link to={visitor ? VMS_PATHS.visitorDetails(visitor.id) : VMS_PATHS.visitors}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {visitor ? "Visitor Details" : "Visitors"}
          </Link>
        </Button>
      }
    >
      {loading ? (
        <EmptyState icon={<Camera className="h-5 w-5" aria-hidden="true" />} title="Loading visitor..." />
      ) : error ? (
        <EmptyState
          icon={<Camera className="h-5 w-5" aria-hidden="true" />}
          title="Visitor not loaded"
          description={error}
          actions={
            <Button asChild variant="outline">
              <Link to={VMS_PATHS.visitors}>Open Visitors</Link>
            </Button>
          }
        />
      ) : (
        <CameraCapture />
      )}
    </VmsPage>
  );
}

export default FaceCapture;
