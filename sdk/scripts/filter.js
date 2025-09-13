// Dropdown functionality
function initializeDropdowns() {
    const dropdowns = document.querySelectorAll('.filter-dropdown');
    // toggleDropdowns(dropdowns);

    // CommonMethods2To7_2
    VSS.require(["TFS/Dashboards/WidgetHelpers", "VSS/Service", "TFS/VersionControl/GitRestClient"], async function (WidgetHelpers, VSS_Service, VSS_REPOSITORIES) {
        const projectId = VSS.getWebContext().project.id;
        console.log("VSS_REPOSITORIES:", VSS_REPOSITORIES);
        let commonMethods = VSS_Service.getCollectionClient(VSS_REPOSITORIES.CommonMethods2To7_2);

        commonMethods.getRepositories(projectId).then(repositories => {
            if (repositories != null && repositories.length > 0) {
                repositories.map(repo => {
                    const repoDropdown = document.getElementById('repositoryDropdown');
                    const repoItem = document.createElement('div');
                    repoItem.className = 'dropdown-item';
                    repoItem.dataset.value = repo.id;
                    repoItem.textContent = repo.name;
                    repoDropdown.appendChild(repoItem);
                });
            }
            console.log("Repositories:", repositories);
            return repositories;
        }).then(() => {
            toggleDropdowns(dropdowns);
        });

    });
}

function toggleDropdowns(dropdowns) {
    dropdowns.forEach(dropdown => {
        const button = dropdown.querySelector('.dropdown-button');
        const content = dropdown.querySelector('.dropdown-content');
        const items = dropdown.querySelectorAll('.dropdown-item');

        // Toggle dropdown
        button.addEventListener('click', (e) => {
            e.stopPropagation();

            // Close other dropdowns
            document.querySelectorAll('.dropdown-content').forEach(other => {
                if (other !== content) {
                    other.classList.remove('show');
                    other.parentElement.querySelector('.dropdown-button').classList.remove('active');
                }
            });

            // Toggle current dropdown
            content.classList.toggle('show');
            button.classList.toggle('active');
        });

        // Handle item selection
        items.forEach(item => {
            item.addEventListener('click', () => {
                // Remove previous selection
                items.forEach(i => i.classList.remove('selected'));

                // Add selection to clicked item
                item.classList.add('selected');

                // Update button text
                let buttonText = button.querySelector('span') ?
                    button.firstChild.textContent.trim() :
                    button.buttonText.trim();

                if (item.dataset.value !== 'all') {
                    button.innerHTML = `${item.textContent} <span class="dropdown-arrow"></span>`;
                } else {
                    buttonText = button.getAttribute('aria-label').trim();
                    button.innerHTML = `${buttonText} <span class="dropdown-arrow"></span>`;
                }

                // Close dropdown
                content.classList.remove('show');
                button.classList.remove('active');

                // Trigger filter event
                onFilterChange();
            });
        });
    });
}

// Close dropdowns when clicking outside
document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-content').forEach(dropdown => {
        dropdown.classList.remove('show');
        dropdown.parentElement.querySelector('.dropdown-button').classList.remove('active');
    });
});

// Close button functionality
document.getElementById('closeButton').addEventListener('click', () => {
    // Reset all filters
    document.getElementById('searchInput').value = '';

    // Reset all dropdowns
    document.querySelectorAll('.dropdown-item.selected').forEach(item => {
        item.classList.remove('selected');
    });

    document.querySelectorAll('.dropdown-button').forEach(button => {
        const originalText = button.textContent.replace('\u25BC', '').trim();
        console.log('Original Text:', originalText);
        button.innerHTML = `${originalText} <span class="dropdown-arrow"></span>`;
    });

    onFilterChange();
});

function getFilters() {
    const selectedFilters = {};
    const searchValue = document.getElementById('searchInput').value;

    document.querySelectorAll('.dropdown-item.selected').forEach(item => {
        const dropdown = item.closest('.filter-dropdown');
        const filterId = dropdown.querySelector('.dropdown-button').getAttribute('aria-label');
        console.log('Filter ID:', filterId, 'Value:', item.dataset.value);
        selectedFilters[filterId] = item.dataset.value === 'all' ? null : item.dataset.value;
    });

    selectedFilters['Name'] = searchValue ? "*" + searchValue + "*" : null;

    console.log('Filter changed:', {
        search: searchValue,
        filters: selectedFilters
    });

    console.log("selectedFilters:", selectedFilters);

    return selectedFilters;
}

// Filter change handler
function onFilterChange() {
    clearPipelineList();
    const selectedFilters = getFilters();

    VSS.require(["TFS/Dashboards/WidgetHelpers", "VSS/Service", "TFS/Build/RestClient"], async function (WidgetHelpers, VSS_Service, TFS_Build_WebApi) {
        const projectId = VSS.getWebContext().project.id;
        let buildClient = VSS_Service.getCollectionClient(TFS_Build_WebApi.BuildHttpClient5);

        console.log("TFS_Build_WebApi:", TFS_Build_WebApi);
        console.log("selectedFilters.Repository:", selectedFilters.Repository);
        const repoType = selectedFilters.Repository ? "tfsgit" : null;
        const path = selectedFilters.Folder ? (selectedFilters.Folder === 'Root' ? "\\" : `\\${selectedFilters.Folder}`) : null;

        buildClient.getDefinitions(projectId, selectedFilters.Name, selectedFilters.Repository, repoType, null, null, null, null, null, path).then((definitions) => {
            let definitionsList = definitions;

            console.log("Definitions fetched:", definitionsList);
            console.log("Selected Filters:", selectedFilters);

            if (selectedFilters.State && selectedFilters.State !== 'all') {
                // "https://dev.azure.com/jririextensiondev/327587a1-abfb-493d-9084-dbb5803f3d01/_apis/build/status/1"
                // get last build for each definition to check status
                definitionsList = definitionsList.filter(def => {
                    return def.queueStatus === Number(selectedFilters.State);
                });
            }

            for (let i = 0; i < definitionsList.length; i++) {
                if (definitionsList[i].path !== "\\") {
                    createPipelineFolder(definitionsList[i]);
                    loadPipelinesInOpenedFolder(definitionsList[i]);
                }

                else {
                    const pipelineItem = createPipelineItem(definitionsList[i]);
                    pipelineList.appendChild(pipelineItem);
                }

            }
        }).catch((error) => {
            console.error("Error fetching definitions:", error);
        });

        VSS.notifyLoadSucceeded();
    });

    // Here you would typically call your filter function
    // applyFilters(searchValue, selectedFilters);
}

// Initialize the component
initializeDropdowns();

// Example function to get current filter values
// function getCurrentFilters() {
//     const searchValue = document.getElementById('searchInput').value;
//     const filters = {};

//     document.querySelectorAll('.dropdown-item.selected').forEach(item => {
//         const dropdown = item.closest('.filter-dropdown');
//         const filterId = dropdown.querySelector('.dropdown-button').id.replace('Button', '');
//         filters[filterId] = item.dataset.value;
//     });

//     return { search: searchValue, filters };
// }