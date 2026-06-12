import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import type { Seat } from "@/types/api";

/** Large avatar shown in the seat detail popover/panel. */
export function SeatStudentAvatar({ seat }: { seat: Seat }) {
  return (
    <ProfileAvatar
      src={seat.student_profile_image ?? seat.student_profile_photo}
      name={seat.student_name}
      size="lg"
      shape="circle"
    />
  );
}
