import { Metadata } from "next";
import UnderConstruction from "@/app/_components/under-construction";

export const metadata: Metadata = {
  title: "Settings | Under Construction",
  description: "Your settings dashboard is currently being optimized.",
};

const SettingsPage = () => {
  return (
    <UnderConstruction
      title={
        <>
          Settings Panel is <br />
          <span className="text-gradient">Under Construction</span>
        </>
      }
      description="We are currently fine-tuning your configuration experience. Enhanced settings and preferences will be available shortly."
      linkHref="/"
      linkText="Back to Dashboard →"
    />
  );
};

export default SettingsPage;
