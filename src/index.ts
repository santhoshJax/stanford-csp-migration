/**
 * This project represents a code-native integration. A customer
 * user will walk through a config wizard (defined in configPages.ts),
 * and flows for that customer (defined in flows.ts) will run.
 *
 * To test this integration, run "npm run test". To publish the integration,
 * run "npm run build" and then "prism integrations:import --open".
 */

import { integration } from "@prismatic-io/spectral";
import studentFlows from "./studentFlow";
import accountLoginFlows from "./accountLoginFlow";
import instructorFlows from "./instructorFlow";
import associateFlows from "./associateFlow";
import departmentFlows from "./departmentFlow";
import quarterFlows from "./quarterFlow";
import quarterBefore2013Flows from "./quarterBefore2013Flow";
import coursesImport2YearFlows from "./coursesImport2Year";
import coursesImport5YearFlows from "./coursesImport5Year";
import coursesImportAllTimeFlows from "./coursesImportAllTime";
import tuitionRuleFlows from "./tuitionruleFlow";
import unitRuleFlows from "./unitRuleFlow";
import courseAssociateInstructorFlows from "./courseAssociateInstructorFlow";
import courseOtherCostFlows from "./courseOtherCostFlow";
import courseTimecardFlows from "./courseTimecardFlow";
import courseworkFlows from "./courseworkFlow";
import registrationFlows from "./registrationFlow";
import purchaseInventoryFlows from "./purchaseInventoryFlow";
import purchaseFlows from "./purchaseFlow";
import purchaseItemFlows from "./purchaseItemFlow";
import paymentsFlows from "./paymentsFlow";
import enrollmentFlows from "./enrollmentFlow";
import enrollmentsImportAllTimeFlows from "./enrollmentsImportAllTime";
import enrollmentWaiverFlows from "./enrollmentWaiverFlow";
import transcriptRequestFlows from "./transcriptRequestFlow";
import textbookFlows from "./textbookFlow";
import certificateProgramFlows from "./certificateProgramFlow";
import certificateCourseFlows from "./certificateCourseFlow";
import studentCertificateFlows from "./studentCertificateFlow";
import alertFlows from "./alertFlow";
import { configPages } from "./configPages";
import { componentRegistry } from "./componentRegistry";
import documentation from "../documentation.md";

export { configPages } from "./configPages";
export { componentRegistry } from "./componentRegistry";

export default integration({
  name: "Stanford CSP Migration",
  description:
    "Stream large TSV files from Google Drive and import to Salesforce",
  iconPath: "icon.png",
  documentation,
  flows: [
    ...studentFlows, // 1. Student
    ...instructorFlows, // 2. Instructor
    ...associateFlows, // 3. Associate
    ...quarterFlows, // 4. Quarter
    ...quarterBefore2013Flows, // 4b. Quarter Import Before 2013
    ...departmentFlows, // 5. Department
    ...unitRuleFlows, // 6. Unit Rule
    ...tuitionRuleFlows, // 7. Tuition Rule
    ...coursesImport2YearFlows, // 8. Course Import - 2 Year
    ...courseAssociateInstructorFlows, // 9. Course Associate Instructor
    ...courseOtherCostFlows, // 10. Course Other Cost
    ...courseTimecardFlows, // 11. Course Timecard
    ...enrollmentFlows, // 12. Enrollment
    ...enrollmentWaiverFlows, // 13. Enrollment Waiver
    ...transcriptRequestFlows, // 14. Transcript Request
    ...courseworkFlows, // 15. Coursework
    ...textbookFlows, // 16. Textbook
    ...certificateProgramFlows, // 17. Certificate Program
    ...certificateCourseFlows, // 18. Certificate Course
    ...studentCertificateFlows, // 19. Student Certificate
    ...registrationFlows, // 20. Registration
    ...alertFlows, // 21. Alert
    ...accountLoginFlows, // 22. Account Login
    ...coursesImport5YearFlows, // 23. Course Import - 5 Year
    ...coursesImportAllTimeFlows, // 24. Course Import - All
    ...enrollmentsImportAllTimeFlows, // 25. Enrollment Import All Time
    ...purchaseInventoryFlows, // 26. Purchase Inventory
    ...purchaseFlows, // 27. Purchase
    ...purchaseItemFlows, // 28. Purchase Item
    ...paymentsFlows, // 29. Payments
  ],
  configPages,
  componentRegistry,
});
