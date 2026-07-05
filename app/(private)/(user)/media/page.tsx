import { Metadata } from "next";
import UnderConstruction from "@/app/_components/UnderConstruction";

// Setting modern page metadata
export const metadata: Metadata = {
  title: "Media Hub | Under Construction - Our Intelligent Pipeline",
  description: "Our interactive media center is currently being built by our intelligent pipeline. Check back soon!",
};

const MediaPage = () => {
  return (
    <UnderConstruction
      title={
        <>
          Our Media Hub is <br />
          <span className="text-gradient">Under Construction</span>
        </>
      }
      description="Our intelligent pipeline is hard at work assembling a seamless knowledge visualization experience. This digital space is currently being optimized."
      linkHref="/"
      linkText="Back to Dashboard →"
    />
  );
};

export default MediaPage;