
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

function loadPipelinesInFolder(folderPath, path) {
    // This function can be used to load pipeline folders if needed
    const folderNameNoSpace = folderPath.replaceAll(' ', '');
    const arrowIcon = document.getElementById(`${'openCloseIcon' + folderNameNoSpace}`);

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
        const isAlreadyLoaded = pipelineFolderContentList.ariaExpanded === 'true';
        if (isAlreadyLoaded) {
            console.log("Pipeline folder content already loaded.");
            return false; // Prevent default link behavior
        }

        VSS.require(["TFS/Dashboards/WidgetHelpers", "VSS/Service", "TFS/Build/RestClient",], async function (WidgetHelpers, VSS_Service, TFS_Build_WebApi) {
            const projectId = VSS.getWebContext().project.id;

            let buildClient = VSS_Service.getCollectionClient(TFS_Build_WebApi.BuildHttpClient5);

            console.log("Loading pipelines in folder:", folderPath);
            buildClient.getDefinitions(projectId, null, null, null, null, null, null, null, null, "\\" + path).then((definitions) => {
                for (let i = 0; i < definitions.length; i++) {
                    const pipelineItem = createPipelineItem(definitions[i], true);
                    pipelineFolderContentList.appendChild(pipelineItem);
                    pipelineFolderContentList.ariaExpanded = 'true';
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
    const arrowIcon = document.getElementById(`${'openCloseIcon' + folderNameNoSpace}`);

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

function toggleDropdown(event, folderName) {
    const dropdownMenu = document.getElementById('folderDropdownMenu' + folderName);
    const isMenuOpen = dropdownMenu.classList.contains('show');
    dropdownMenu.classList.toggle('show', !isMenuOpen);
    event.stopPropagation(); // Prevent the event from bubbling up to document  
}

function hideCustomModal(confirmed) {
    document.getElementById('customModal').classList.remove('show');
    if (modalResolve) {
        modalResolve(confirmed);
        modalResolve = null;
    }
}

function showLoadingModal(text = "Loading...", subtitle = "") {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingSubtitle').textContent = subtitle;
    document.getElementById('progressContainer').style.display = 'none';
    document.getElementById('loadingSpinner').style.display = 'block';
    document.getElementById('loadingOverlay').classList.add('show');

    // Disable scrolling
    document.body.style.overflow = 'hidden';
}

let modalResolve = null;
function hideLoadingModal() {
    document.getElementById('loadingOverlay').classList.remove('show');
    document.body.style.overflow = 'auto';
}

function showBasicLoading() {
    showLoadingModal("In progress...", "Please wait while pipelines are being updated.");
    // showSuccess("Data saved successfully!");
}

function showConfirmDialog(title, message, confirmText = 'Confirm') {
    return new Promise((resolve) => {
        modalResolve = resolve;
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = message;
        document.getElementById('confirmBtn').textContent = confirmText;
        document.getElementById('confirmBtn').className = 'modal-btn modal-btn-confirm';
        document.getElementById('customModal').classList.add('show');
    });
}

function handleMenuClick(action, rawFolderPath, folderName) {
    showConfirmDialog("Confirm", `Are you sure you want to <b>${action}</b> all pipelines in this folder?`).then((confirmed) => {
        if (confirmed) {
            showBasicLoading();

            VSS.require(["TFS/Dashboards/WidgetHelpers", "VSS/Service", "TFS/Build/RestClient",], function (WidgetHelpers, VSS_Service, TFS_Build_WebApi) {
                const projectId = VSS.getWebContext().project.id;
                const buildClient3_2 = VSS_Service.getCollectionClient(TFS_Build_WebApi.BuildHttpClient3_2);
                const commonMethods4To5 = VSS_Service.getCollectionClient(TFS_Build_WebApi.CommonMethods4To5);
                commonMethods4To5.definitionsApiVersion = "5.0-preview.6";

                buildClient3_2.getDefinitions(projectId, null, null, null, null, null, null, null, null, "\\" + rawFolderPath).then((definitions) => {
                    let stateToSet = 1;
                    switch (action) {
                        case 'Pause':
                            stateToSet = 1; // Paused
                            break;
                        case 'Disable':
                            stateToSet = 2; // Disabled
                            break;
                        case 'Enable':
                            stateToSet = 0; // Enabled
                            break;
                        default:
                            console.log("Unknown action:", action);
                            return;
                    }

                    for (let i = 0; i < definitions.length; i++) {

                        if (definitions[i].queueStatus != stateToSet) {
                            commonMethods4To5.getDefinition(definitions[i].id, projectId).then((def) => {
                                def.queueStatus = stateToSet;
                                commonMethods4To5.updateDefinition(def, def.id, projectId).then(() => {
                                    console.log("Pipeline updated");
                                }).catch((error) => {
                                    console.error("Error updating definition:", error);
                                });

                            });
                        }
                    }
                }).then(() => {
                    hideLoadingModal();
                }).catch((error) => {
                    console.error("Error fetching definitions:", error);
                });
            });
        }
        else {
            hideCustomModal(confirmed);
        }
        const dropdownMenu = document.getElementById('folderDropdownMenu' + folderName);
        dropdownMenu.classList.remove('show');
    }).catch((error) => {
        console.error("Error showing confirm dialog:", error);
    });

}

function addElement(folderName, rawFolderPath, element, parentElement, ariaLabel = '', parentName = '') {
    console.log("Adding element:", folderName, "to parent:", parentElement.id, "with ariaLabel:", ariaLabel, "and parentName:", parentName);
    element.innerHTML = `<div class="pipeline-folder-item">
                                <div class="pipeline-details-container">
                                    <div class="pipeline-folder-link" onclick="return loadPipelinesInFolder('${rawFolderPath}', '${ariaLabel}');">
                                        <span class=""><img src="img/to-right.png" alt="Open Close Icon" class="folder-icon" id='${'openCloseIcon' + folderName}'/></span>
                                        <span class=""><img src="img/group-icon.png" alt="Folder Icon" class="folder-icon" /></span>
                                        <div class="pipeline-folder-name">${rawFolderPath}</div>
                                    </div>
                                </div>
                                <button class="three-dots-btn" id="menuBtn" onclick="toggleDropdown(event, '${folderName}')">
                                    <div class="dots">
                                        <div class="dot"></div>
                                        <div class="dot"></div>
                                        <div class="dot"></div>
                                    </div>
                                </button>
                                
                                <div class="folder-dropdown-menu" id="${'folderDropdownMenu' + folderName}">
                                    <div class="menu-item" onclick="handleMenuClick('Enable', '${rawFolderPath}', '${folderName}')">Enable All</div>
                                    <div class="menu-item" onclick="handleMenuClick('Pause', '${rawFolderPath}', '${folderName}')">Pause All</div>
                                    <div class="menu-item" onclick="handleMenuClick('Disable', '${rawFolderPath}', '${folderName}')">Disable All</div>
                                </div>
                            </div>
                            <div class="pipeline-folder-list hidden" id="pipeline-folder-contents-${folderName}" aria-expanded='false'></div>`;

    const parentElementList = document.getElementById('pipeline-folder-contents-' + parentName);
    if (parentElementList) {
        parentElementList.appendChild(element);
    }
    else {
        parentElement.appendChild(element);
    }
}

function createNestedFolders(pipelineFolderName, parentElement, currentLevel = 0, parentName = '') {
    console.log("Creating nested folder for:", pipelineFolderName, "under parent:", parentElement.id, "at level:", currentLevel);
    const nameNoSlash = pipelineFolderName.charAt(0) === '\\' ? pipelineFolderName.substring(1) : pipelineFolderName;
    const folderNestedPath = nameNoSlash.split('\\').length > 1 ? nameNoSlash.split('\\') : [nameNoSlash];

    const folderItem = document.createElement('div');
    const rawFolderPath = folderNestedPath[0];
    const folderName = rawFolderPath.replaceAll(' ', '');

    if (parentElement.id === 'pipelineList') {
        folderItem.id = `pipeline-folder-${folderName}`;
    }
    else {
        folderItem.id = `${parentElement.id}-${folderName}`;
    }


    let ariaLabelPrefix = rawFolderPath;
    if (parentElement.id != 'pipelineList') {
        ariaLabelPrefix = parentElement.ariaLabel + '\\\\' + rawFolderPath;
        folderItem.style.marginLeft = '20px'; // Adds 20px to the left margin
    }
    folderItem.ariaLabel = ariaLabelPrefix;

    const isAlreadyExists = document.getElementById(folderItem.id);
    console.log("Is Already Exists:", isAlreadyExists, "for ID:", folderItem.id);
    if (!isAlreadyExists) {
        addElement(folderName, rawFolderPath, folderItem, parentElement, ariaLabelPrefix, parentName);
    }

    currentLevel++;

    if (folderNestedPath.length > 1) {
        createNestedFolders(folderNestedPath.slice(1).join("\\"), folderItem, currentLevel, folderName);
    }
}

function createPipelineFolder(pipelineFolderName) {
    // console.log("Creating pipeline folder for:", pipelineFolderName);
    const folderNestedPath = pipelineFolderName.split('\\');
    // console.log("Folder Nested Path:", folderNestedPath);

    // if (folderNestedPath.length > 2) {
    //     console.log("Nested folders detected. Creating nested folders.");
    createNestedFolders(pipelineFolderName, document.getElementById('pipelineList'));
    //     return;
    // }

    // if (folderNestedPath.length <= 2) {
    //     console.log("No nested folders. Creating single folder.");
    //     const pipelineItem = document.createElement('div');
    //     const rawFolderPath = pipelineFolderName.substring(1, pipelineFolderName.length);
    //     const folderName = pipelineFolderName.substring(1, pipelineFolderName.length).replaceAll(' ', '');
    //     const pipelineList = document.getElementById('pipelineList');
    //     pipelineItem.id = 'pipeline-folder-' + folderName;

    //     const isAlreadyExists = document.getElementById(pipelineItem.id);
    //     if (isAlreadyExists) {
    //         return;
    //     }
    //     addElement(folderName, rawFolderPath, pipelineItem, pipelineList);
    // }
}

function clearPipelineList() {
    const elementsToDelete = document.querySelectorAll('div.pipeline-item');
    elementsToDelete.forEach(element => element.remove());

    const folderElementsToDelete = document.querySelectorAll('div[id^="pipeline-folder-"]');
    folderElementsToDelete.forEach(element => element.remove());
}

function getAllFolders(commonMethods, buildClient, projectId) {
    commonMethods.getFolders(projectId).then((folders) => {
        console.log("Folders:", folders);

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
                createPipelineFolder(folder.path);
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

        // console.log("VSS_Service:", VSS_Service);
        console.log("TFS_Build_WebApi:", TFS_Build_WebApi);
        // console.log("buildClient:", buildClient);
        // console.log("commonMethods:", commonMethods);
        // console.log("commonMethods2To5:", commonMethods2To5);

        getAllFolders(commonMethods, buildClient, projectId);

        getTags(commonMethods2To5, projectId);

        VSS.notifyLoadSucceeded();
    });
}