import {
    getCommonHeader,
    getLabel,
    getBreak
  } from "egov-ui-framework/ui-config/screens/specs/utils";
  import propertySearchTabs from "./capture-mutation-details";
  import { searchProperty } from "./searchResource/searchProperty";
  import { setRoute } from "egov-ui-framework/ui-redux/app/actions";
  import { getQueryArg } from "egov-ui-framework/ui-utils/commons";
  import { pendingMutationApprovals } from "./searchResource/pendingMutationApprovals";
  import { prepareFinalObject } from "egov-ui-framework/ui-redux/screen-configuration/actions";
  // import { progressStatus } from "./searchResource/progressStatus";
  import { searchMutationResults } from "./searchResource/searchMutationResults";
  import {searchApplications} from "./searchResource/searchApplications";
  import {searchMutationApplicationResults} from "./searchResource/searchMutationApplications"
  import { localStorageGet,getTenantId } from "egov-ui-kit/utils/localStorageUtils";
  import {Tabs} from "egov-ui-kit/components/Tabs";
  import find from "lodash/find";
  import {searchPropertyTable,searchApplicationTable} from "./searchResource/searchResults";
  import { httpRequest } from "../../../../ui-utils";
  import commonConfig from "config/common.js";
  import YearDialogue from "egov-ui-kit/common/propertyTax/YearDialogue";
  import { adhocPopup } from "./adhocPopup";
  import { showHideAdhocPopup} from "../utils";

  const hasButton = getQueryArg(window.location.href, "hasButton");
  let enableButton = true;
  enableButton = hasButton && hasButton === "false" ? false : true;
  const tenant= getTenantId();

  //console.log(captureMutationDetails);

  const getMDMSData = async (dispatch) => {
    const mdmsBody = {
      MdmsCriteria: {
        tenantId: commonConfig.tenantId,
        moduleDetails: [
          {
            moduleName: "tenant",
            masterDetails: [
              {
                name: "tenants"
              }
            ]
          }
        ]
      }
    }
    try {
      const payload = await httpRequest(
        "post",
        "/egov-mdms-service/v1/_search",
        "_search",
        [],
        mdmsBody
      );
      console.log("payload--", payload)
      dispatch(prepareFinalObject("searchScreenMdmsData", payload.MdmsRes));
    } catch (e) {
      console.log(e);
    }
  };
  
  const header = getCommonHeader({
    labelName: "Property Tax",
    labelKey: "PROPERTY_TAX"
  });
  const screenConfig = {
    uiFramework: "material-ui",
    name: "propertySearch",

    beforeInitScreen: (action, state, dispatch) => {
      getMDMSData(dispatch);
    return action;
  },
    
    components: {
      div: {
        uiFramework: "custom-atoms",
        componentPath: "Form",
        props: {
          className: "common-div-css",
          id: "search"
        },
        children: {
          headerDiv: {
            uiFramework: "custom-atoms",
            componentPath: "Container",
  
            children: {
              header: {
                gridDefination: {
                  xs: 12,
                  sm: 6
                },
                ...header
              },
              newApplicationButton: {
                componentPath: "Button",
                gridDefination: {
                  xs: 12,
                  sm: 6,
                  align: "right"
                },
                visible: enableButton,
                props: {
                  variant: "contained",
                  color: "primary",
                  style: {
                    color: "white",
                    borderRadius: "2px",
                    width: "250px",
                    height: "48px"
                  }
                },
  
                children: {
                  plusIconInsideButton: {
                    uiFramework: "custom-atoms",
                    componentPath: "Icon",
                    props: {
                      iconName: "add",
                      style: {
                        fontSize: "24px"
                      }
                    }
                  },
  
                  buttonLabel: getLabel({
                    labelName: "Add New Property",
                    labelKey: "PT_ADD_NEW_PROPERTY_BUTTON"
                  })
                },
                onClickDefination: {
                  action: "condition",
                  callBack: (state, dispatch) => {
                    showHideAdhocPopup(state, dispatch, "search");
                    
                  }
                },
                // roleDefination: {
                //   rolePath: "user-info.roles",
                //   path : "tradelicence/apply"
  
                // }
              }
            }
          },
          propertySearchTabs,
         breakAfterSearch: getBreak(),
         searchPropertyTable,
         searchApplicationTable
          // searchProperty,
          // breakAfterSearch: getBreak(),
          // searchMutationResults,     
          // searchApplications,
          // breakAfterSearch: getBreak(),
          // searchMutationApplicationResults,

        }
      },
      adhocDialog: {
          uiFramework: "custom-containers-local",
          moduleName: "egov-pt",
          componentPath: "DialogContainer",
          props: {
            open: false,
            maxWidth: "sm",
            screenKey: "search"
          },
          children: {
            popup: adhocPopup
          }
        }
    }
  };
  
  export default screenConfig;
  