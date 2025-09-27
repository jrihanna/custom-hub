
function reloadPipelineRun(pipelineId) {
    VSS.require(["TFS/Dashboards/WidgetHelpers", "VSS/Service", "TFS/Build/RestClient",], async function (WidgetHelpers, VSS_Service, TFS_Build_WebApi) {
        const projectId = VSS.getWebContext().project.id;
        const reloadImage = document.getElementById('reload-image-' + pipelineId)
        reloadImage.classList.add('rotate-animation');

        function reloadBadge(counter = 0, build, pipelineId) {
            setTimeout(() => {
                if (build.status == 2) {
                    console.log("Build completed");
                    const reloadImage = document.getElementById('reload-image-' + pipelineId);
                    reloadImage.classList.remove('rotate-animation');

                    const pipelineBadge = document.getElementById(pipelineId + '-badge');
                    pipelineBadge.src = build._links.badge.href + '?' + new Date().getTime();
                    return;
                }

                if (build.status != 2) {
                    buildClient.getBuild(build.id, projectId).then((updatedBuild) => {
                        counter++;
                        reloadBadge(counter, updatedBuild, pipelineId, build._links.badge.href);
                    }).catch((error) => {
                        console.error("Error fetching updated build:", error);
                    });
                }
            }, 1000);
        }

        let buildClient5 = VSS_Service.getCollectionClient(TFS_Build_WebApi.BuildHttpClient5);
        let buildClient = VSS_Service.getCollectionClient(TFS_Build_WebApi.BuildHttpClient2);

        buildClient5.getLatestBuild(projectId, pipelineId).then((build) => {
            const params = {
                "definition": {
                    "id": pipelineId
                },
                "sourceBranch": build.sourceBranch
            }

            buildClient.queueBuild(params, projectId).then((build) => {
                reloadBadge(0, build, pipelineId);
            }).catch((error) => {
                console.error("Error queuing pipeline run:", error);
            });
        }).catch((error) => {
        });


    });
}

function createPipelineItem(pipeline, nested = false) {
    console.log("pipeline:", pipeline);
    let pipelineStatus = pipeline.queueStatus;

    // use _links to get the URL for the pipeline and badge
    const pipelineURL = pipeline._links.web.href;
    const pipelineItem = document.createElement('div');
    let definitionStatusText = '';
    let definitionStatusClass = '';
    let definitionStatusSrc = '';
    let reloadIcon = '';
    const nestedClass = nested ? 'pipeline-nested' : '';
    const clearedURL = pipelineURL.substring(0, pipelineURL.lastIndexOf('/'));
    const lastBuildURL = clearedURL + '/latest/' + pipeline.id;

    switch (pipelineStatus) {
        case 0:
            definitionStatusText = '';
            reloadIcon = `<img src="img/reload-icon-20.png" class="reload-icon" title="Run" alt="Pipeline Reload" onclick="reloadPipelineRun(${pipeline.id});" id="reload-image-${pipeline.id}"/>`;
            break;
        case 1:
            definitionStatusText = 'Pipeline is paused';
            definitionStatusSrc = 'img/paused-red.png';
            definitionStatusClass = 'pipeline-paused';
            break;
        case 2:
            definitionStatusText = 'Pipeline is disabled';
            definitionStatusSrc = 'img/error-32-fill.png';
            definitionStatusClass = 'pipeline-disabled';
            break;
        default:
            definitionStatusText = '';
    }

    pipelineItem.className = 'pipeline-item ' + definitionStatusClass;

    pipelineItem.innerHTML = `<div class="pipeline-info">
                                <div class="pipeline-details-container">
                                    <a href="${pipelineURL}" class="pipeline-link" target="_blank">
                                        <div class="pipeline-name ${nestedClass}">${pipeline.name}</div>
                                        <span class="pipeline-status"><img src="${definitionStatusSrc}" alt="${definitionStatusText}" width="16px"  title="${definitionStatusText}"></span>
                                    </a>
                                </div>
                                <div class="pipeline-status-badge">
                                    <a href="${lastBuildURL}" target="_blank">
                                        <span><img src="${pipeline._links.badge.href}" alt="Pipeline Badge" id="${pipeline.id + '-badge'}" class="badge-icon" /></span>
                                    </a><span>${reloadIcon}</span>
                                </div>
                            </div>`;

    return pipelineItem;
}

function loadPipelinesInFolder(folderPath) {
    console.log("folderPathsfdsfgfdg:", folderPath);
    // This function can be used to load pipeline folders if needed
    const folderNameNoSpace = folderPath.replaceAll(' ', '');
    const arrowIcon = document.getElementById('openCloseIcon');

    const pipelineFolderContentList = document.getElementById('pipeline-folder-contents-' + folderNameNoSpace);

    const isVisible = pipelineFolderContentList.checkVisibility();
    if (arrowIcon) {
        arrowIcon.src = isVisible ? 'img/to-right.png' : 'img/to-down.png';
    }

    pipelineFolderContentList.classList.toggle('hidden');


    const sampleDefinition = { id: "0", name: "Sample", path: "\\" + folderPath, _links: { web: { href: "#" }, badge: { href: "#" } }, queueStatus: 0 };
    // const pipelineItem0 = createPipelineItem(sampleDefinition, true);
    // pipelineFolderContentList.appendChild(pipelineItem0);

    if (!isVisible) {
        const isAlreadyLoaded = pipelineFolderContentList.children.length > 0;
        if (isAlreadyLoaded) {
            console.log("Pipeline folder content already loaded.");
            return false; // Prevent default link behavior
        }



        VSS.require(["TFS/Dashboards/WidgetHelpers", "VSS/Service", "TFS/Build/RestClient",], async function (WidgetHelpers, VSS_Service, TFS_Build_WebApi) {
            const projectId = VSS.getWebContext().project.id;

            let buildClient = VSS_Service.getCollectionClient(TFS_Build_WebApi.BuildHttpClient5);

            buildClient.getDefinitions(projectId, null, null, null, null, null, null, null, null, "\\" + folderPath).then((definitions) => {
                for (let i = 0; i < definitions.length; i++) {
                    const pipelineItem = createPipelineItem(definitions[i], true);
                    pipelineFolderContentList.appendChild(pipelineItem);
                }
            }).catch((error) => {
                console.error("Error fetching definitions:", error);
            });
        });
    }

    return false; // Prevent default link behavior
}

function loadPipelinesInOpenedFolder(definition) {
    // This function can be used to load pipeline folders if needed
    const rawFolderPath = definition.path.substring(1, definition.path.length);
    const folderNameNoSpace = rawFolderPath.replaceAll(' ', '');
    const arrowIcon = document.getElementById('openCloseIcon');

    const pipelineFolderContentList = document.getElementById('pipeline-folder-contents-' + folderNameNoSpace);

    const isVisible = pipelineFolderContentList.checkVisibility();
    if (arrowIcon) {
        arrowIcon.src = isVisible ? 'img/to-right.png' : 'img/to-down.png';
    }

    pipelineFolderContentList.classList.toggle('hidden');

    const pipelineItem = createPipelineItem(definition, true);
    pipelineFolderContentList.appendChild(pipelineItem);

    return false; // Prevent default link behavior
}

function toggleDropdown(event, rawFolderPath) {
    const dropdownMenu = document.getElementById('folderDropdownMenu' + rawFolderPath);
    const isMenuOpen = dropdownMenu.classList.contains('show');
    dropdownMenu.classList.toggle('show', !isMenuOpen);
    event.stopPropagation(); // Prevent the event from bubbling up to document  
}

const TriggerTypeMap = {
    1: "none",
    2: "continuousIntegration",
    4: "batchedContinuousIntegration",
    8: "schedule",
    16: "gatedCheckIn",
    32: "batchedGatedCheckIn",
    64: "pullRequest",
    128: "buildCompletion",
    255: "all"
}

const BuildTypes = {
    1: "Xaml",
    2: "Build"
}

const DefinitionQueueStatusType = {
    0: "enabled",
    1: "paused",
    2: "disabled"
}

const DefinitionQualityType = {
    1: "definition",
    2: "draft"
}

function correctPayload(definition) {
    let correctedDefinition = definition;
    if (definition.triggers) {
        definition.triggers.forEach((trigger, index) => {
            correctedDefinition.triggers[index].triggerType = TriggerTypeMap[trigger.triggerType];
        });

        correctedDefinition.type = BuildTypes[definition.type];
        correctedDefinition.queueStatus = DefinitionQueueStatusType[definition.queueStatus];
        correctedDefinition.quality = DefinitionQualityType[definition.quality];
        correctedDefinition.process = {
            type: 2,
        }
        return correctedDefinition;
    }
}

function handleMenuClick(action, rawFolderPath, folderName) {
    const dropdownMenu = document.getElementById('folderDropdownMenu' + folderName);
    dropdownMenu.classList.remove('show');
    // let processss = {
    //     yamlFilename: "",
    //     type: 2
    // };
    VSS.require(["TFS/Dashboards/WidgetHelpers", "VSS/Service", "TFS/Build/RestClient",], function (WidgetHelpers, VSS_Service, TFS_Build_WebApi) {
        const projectId = VSS.getWebContext().project.id;
        const buildClient3_2 = VSS_Service.getCollectionClient(TFS_Build_WebApi.BuildHttpClient3_2);
        const commonMethods4To5 = VSS_Service.getCollectionClient(TFS_Build_WebApi.CommonMethods4To5);
        commonMethods4To5.definitionsApiVersion = "5.0-preview.6";

        commonMethods4To5.getDefinition(1, projectId).then((def) => {
            console.log("Fetched definition:", def);
            def.queueStatus = 1; // Paused
            // def.process = processss;
            // def["process"] = processss;
            // def.buildProcess = { type: 'T' };
            console.log("def after change:", def);
            let d1 = def;
            console.log("d1:", d1);

            commonMethods4To5.updateDefinition(d1, d1.id, projectId).then(() => {
                console.log("Pipelines paused");
            }).catch((error) => {
                console.error("Error updating definition:", error);
            });

        });
        //     buildClient3_2.getDefinitions(projectId, null, null, null, null, null, null, null, null, "\\" + rawFolderPath).then((definitions) => {
        //         // console.log("definitions to pause:", definitions);

        //         for (let i = 0; i < definitions.length; i++) {

        //             // console.log("Pausing pipeline:", definitions[i]);

        //             buildClient3_2.getDefinition(definitions[i].id, projectId, definitions[i].revision).then((def) => {
        //                 console.log("Fetched definition:", def);
        //                 def.queueStatus = 1; // Paused
        //                 def.process = { "type": 2 };
        //                 console.log("def after change:", def);

        //                 buildClient3_2.updateDefinition(def, def.id, projectId).then(() => {
        //                     console.log("Pipelines paused");
        //                 }).catch((error) => {
        //                     console.error("Error updating definition:", error);
        //                 });
        //             });

        //         }
        //     }).catch((error) => {
        //         console.error("Error fetching definitions:", error);
        //     });
    });
}

function createPipelineFolder(pipelineFolder) {
    const pipelineItem = document.createElement('div');
    const rawFolderPath = pipelineFolder.path.substring(1, pipelineFolder.path.length);
    const folderName = pipelineFolder.path.substring(1, pipelineFolder.path.length).replaceAll(' ', '');
    const pipelineList = document.getElementById('pipelineList');
    pipelineItem.id = 'pipeline-folder-' + folderName;

    pipelineItem.innerHTML = `<div class="pipeline-folder-item">
                                <div class="pipeline-details-container">
                                    <div class="pipeline-folder-link" onclick="return loadPipelinesInFolder('${rawFolderPath}');">
                                        <span class=""><img src="img/to-right.png" alt="Open Close Icon" class="folder-icon" id="openCloseIcon"/></span>
                                        <span class=""><img src="img/group-icon.png" alt="Folder Icon" class="folder-icon" /></span>
                                        <div class="pipeline-folder-name">${rawFolderPath}</div>
                                    </div>
                                </div>
                                <button class="three-dots-btn" id="menuBtn" onclick="toggleDropdown(event, '${rawFolderPath}')">
                                    <div class="dots">
                                        <div class="dot"></div>
                                        <div class="dot"></div>
                                        <div class="dot"></div>
                                    </div>
                                </button>
                                
                                <div class="folder-dropdown-menu" id="${'folderDropdownMenu' + folderName}">
                                    <div class="menu-item" onclick="handleMenuClick('pause', '${rawFolderPath}', '${folderName}')">Pause All</div>
                                </div>
                            </div>
                            <div class="pipeline-folder-list hidden" id="pipeline-folder-contents-${folderName}"></div>`;


    pipelineList.prepend(pipelineItem);
}

function clearPipelineList() {
    const elementsToDelete = document.querySelectorAll('div.pipeline-item');
    elementsToDelete.forEach(element => element.remove());

    const folderElementsToDelete = document.querySelectorAll('div[id^="pipeline-folder-"]');
    folderElementsToDelete.forEach(element => element.remove());
}

function getAllFolders(commonMethods, buildClient, projectId) {
    commonMethods.getFolders(projectId).then((folders) => {

        const foldersDropdown = document.getElementById("folderDropdown");
        folders.forEach(folder => {

            let folderPath = folder.path === "\\" ? "Root" : folder.path.replaceAll("\\", "");
            const folderItem = document.createElement("div");
            folderItem.className = "dropdown-item";
            folderItem.setAttribute("data-value", folderPath);
            folderItem.textContent = folderPath;
            foldersDropdown.appendChild(folderItem);

            if (folder.path === '\\') {
                buildClient.getDefinitions(projectId, null, null, null, null, null, null, null, null, "\\").then((definitions) => {
                    for (let i = 0; i < definitions.length; i++) {
                        const pipelineItem = createPipelineItem(definitions[i]);
                        pipelineList.appendChild(pipelineItem);
                    }
                }).catch((error) => {
                    console.error("Error fetching definitions:", error);
                });
            }
            else {
                createPipelineFolder(folder);
                // pipelineList.appendChild(pipelineItem);
            }
        });
    }).catch((error) => {
        console.error("Error fetching folders:", error);
    });
}

function getTags(commonMethods2To5, projectId) {
    commonMethods2To5.getTags(projectId).then((tags) => {
        const tagsDropdown = document.getElementById("tagsDropdown");
        tags.forEach(tag => {
            const tagItem = document.createElement("div");
            tagItem.className = "dropdown-item";
            tagItem.setAttribute("data-value", tag);
            tagItem.textContent = tag;
            tagsDropdown.appendChild(tagItem);
        });
    }).catch((error) => {
        console.error("Error fetching tags:", error);
    });
}

function initializePipelineList() {
    clearPipelineList();

    VSS.require(["TFS/Dashboards/WidgetHelpers", "VSS/Service", "TFS/Build/RestClient"], async function (WidgetHelpers, VSS_Service, TFS_Build_WebApi) {
        const projectId = VSS.getWebContext().project.id;
        let buildClient = VSS_Service.getCollectionClient(TFS_Build_WebApi.BuildHttpClient5);
        let commonMethods = VSS_Service.getCollectionClient(TFS_Build_WebApi.CommonMethods3To5);
        let commonMethods2To5 = VSS_Service.getCollectionClient(TFS_Build_WebApi.CommonMethods2To5);

        console.log("VSS_Service:", VSS_Service);
        console.log("TFS_Build_WebApi:", TFS_Build_WebApi);
        console.log("buildClient:", buildClient);
        console.log("commonMethods:", commonMethods);
        console.log("commonMethods2To5:", commonMethods2To5);

        getAllFolders(commonMethods, buildClient, projectId);

        getTags(commonMethods2To5, projectId);

        VSS.notifyLoadSucceeded();
    });
}