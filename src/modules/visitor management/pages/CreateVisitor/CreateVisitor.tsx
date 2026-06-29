import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VMS_PATHS } from "../../routes/paths";
import { VmsPage } from "../../components/vms/VmsPage";
import CreateVisitorForm from "./CreateVisitorForm";

function CreateVisitor() {
  return (
    <VmsPage
      title="New Visitor"
      description="Create a visitor request in one step. After saving, the record opens with badge, approval, and desk actions available from the detail screen."
      actions={
        <Button asChild variant="outline">
          <Link to={VMS_PATHS.visitors}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Visitors
          </Link>
        </Button>
      }
    >
      <CreateVisitorForm />
    </VmsPage>
  );
}

export default CreateVisitor;
