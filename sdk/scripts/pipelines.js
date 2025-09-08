
function reloadPipelineRun(pipelineId) {
    VSS.require(["TFS/Dashboards/WidgetHelpers", "VSS/Service", "TFS/Build/RestClient",], async function (WidgetHelpers, VSS_Service, TFS_Build_WebApi) {
        const projectId = VSS.getWebContext().project.id;
        let params = {
            "definition": {
                "id": pipelineId
            },
            "sourceBranch": "refs/heads/main"
        }
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

        let buildClient = VSS_Service.getCollectionClient(TFS_Build_WebApi.BuildHttpClient2);
        buildClient.queueBuild(params, projectId).then((build) => {
            reloadBadge(0, build, pipelineId);
        }).catch((error) => {
            console.error("Error queuing pipeline run:", error);
        });
    });
}

// Function to create a pipeline item element
function createPipelineItem(pipeline, nested = false) {

    let pipelineStatus = pipeline.queueStatus;

    // use _links to get the URL for the pipeline and badge
    const pipelineURL = pipeline._links.web.href;
    const pipelineItem = document.createElement('div');
    let definitionStatusText = '';
    let definitionStatusClass = '';
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
            definitionStatusClass = 'img/crisis.png';
            break;
        case 2:
            definitionStatusText = 'Pipeline is disabled';
            definitionStatusClass = 'img/forbidden.png';
            break;
        default:
            definitionStatusText = '';
    }

    pipelineItem.className = 'pipeline-item';

    pipelineItem.innerHTML = `<div class="pipeline-info">
                                <div class="pipeline-details-container">
                                    <a href="${pipelineURL}" class="pipeline-link" target="_blank">
                                        <div class="pipeline-name ${nestedClass}">${pipeline.name}</div>
                                    </a>
                                </div>
                                <div style="flex: 1;"><span class="pipeline-status"><img src="${definitionStatusClass}" alt="${definitionStatusText}"  title="${definitionStatusText}"></span></div>
                                <div class="pipeline-status-badge">
                                    <a href="${lastBuildURL}" target="_blank">
                                        <span><img src="${pipeline._links.badge.href}" alt="Pipeline Badge" id="${pipeline.id + '-badge'}" class="badge-icon" /></span>
                                    </a><span>${reloadIcon}</span>
                                </div>
                            </div>`;

    return pipelineItem;
}

function loadPipelinesInFolder(folderPath) {
    // This function can be used to load pipeline folders if needed
    const folderNameNoSpace = folderPath.replaceAll(' ', '');
    const arrowIcon = document.getElementById('openCloseIcon');

    const pipelineFolderContentList = document.getElementById('pipeline-folder-contents-' + folderNameNoSpace);

    const isVisible = pipelineFolderContentList.checkVisibility();
    if (arrowIcon) {
        arrowIcon.src = isVisible ? 'img/to-right.png' : 'img/to-down.png';
    }

    pipelineFolderContentList.classList.toggle('hidden');

    if (!isVisible) {
        const isAlreadyLoaded = pipelineFolderContentList.children.length > 0;
        if (isAlreadyLoaded) {
            console.log("Pipeline folder content already loaded.");
            return false; // Prevent default link behavior
        }
        VSS.require(["TFS/Dashboards/WidgetHelpers", "VSS/Service", "TFS/Build/RestClient",], async function (WidgetHelpers, VSS_Service, TFS_Build_WebApi) {
            const projectId = VSS.getWebContext().project.id;

            const selectedFilters = getFilters();
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

function createPipelineFolder(pipelineFolder) {
    console.log("Creating folder for path:", pipelineFolder.path);
    const pipelineItem = document.createElement('div');
    const rawFolderPath = pipelineFolder.path.substring(1, pipelineFolder.path.length);
    const folderName = pipelineFolder.path.substring(1, pipelineFolder.path.length).replaceAll(' ', '');
    pipelineItem.id = 'pipeline-folder-' + folderName;

    pipelineItem.innerHTML = `<div class="pipeline-details-container">
                    <div class="pipeline-folder-link" onclick="return loadPipelinesInFolder('${rawFolderPath}');">
                        <span class=""><img src="img/to-right.png" alt="Open Close Icon" class="folder-icon" id="openCloseIcon"/></span>
                        <span class=""><img src="img/group-icon.png" alt="Folder Icon" class="folder-icon" /></span>
                        <div class="pipeline-folder-name">${rawFolderPath}</div>
                    </div>
                </div>
                <div class="pipeline-folder-list hidden" id="pipeline-folder-contents-${folderName}"></div>`;


    pipelineList.prepend(pipelineItem);;
}

function clearPipelineList() {
    const elementsToDelete = document.querySelectorAll('div.pipeline-item');
    elementsToDelete.forEach(element => element.remove());

    const folderElementsToDelete = document.querySelectorAll('div[id^="pipeline-folder-"]');
    folderElementsToDelete.forEach(element => element.remove());
}