document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소 가져오기
    const authContainer = document.getElementById('auth-container');
    const mainContainer = document.getElementById('main-container');
    const loader = document.getElementById('loader');

    const repoOwnerInput = document.getElementById('repo-owner');
    const repoNameInput = document.getElementById('repo-name');
    const tokenInput = document.getElementById('github-token');
    const loginBtn = document.getElementById('login-btn');

    const itemList = document.getElementById('item-list');
    const addItemBtn = document.getElementById('add-item-btn');
    
    const viewer = document.getElementById('viewer');
    const editorContainer = document.getElementById('editor');
    const editSaveBtn = document.getElementById('edit-save-btn');
    const statusText = document.getElementById('status-text');

    // 상태 변수
    let octokit;
    let repoOwner, repoName;
    let manualData = [];
    let fileSha; // GitHub 파일 업데이트에 필요
    let selectedItemId = null;
    let editorInstance = null;
    let isEditMode = false;
    
    const MANUAL_FILE_PATH = 'manual.json';

    // Toast UI Editor와 Viewer 초기화
    const { Editor } = toastui;
    const Viewer = Editor.factory({
        el: viewer,
        viewer: true,
    });

    // --- 유틸리티 함수 ---
    const showLoader = (show) => loader.classList.toggle('hidden', !show);

    const switchView = (showMain) => {
        authContainer.classList.toggle('hidden', showMain);
        mainContainer.classList.toggle('hidden', !showMain);
    };

    // --- GitHub API 통신 함수 ---
    
    async function getManualFile() {
        showLoader(true);
        try {
            const { data } = await octokit.rest.repos.getContent({
                owner: repoOwner,
                repo: repoName,
                path: MANUAL_FILE_PATH,
            });
            fileSha = data.sha;
            // Base64 디코딩 후 JSON 파싱
            manualData = JSON.parse(atob(data.content));
            return true;
        } catch (error) {
            if (error.status === 404) {
                 // 파일이 없는 경우, 빈 배열로 시작
                manualData = [];
                fileSha = null;
                console.warn(`${MANUAL_FILE_PATH} not found. Starting with an empty manual.`);
                return true;
            }
            console.error('Error fetching manual file:', error);
            alert(`매뉴얼 파일을 불러오는 중 오류 발생: ${error.message}`);
            return false;
        } finally {
            showLoader(false);
        }
    }

    async function saveManualFile() {
        showLoader(true);
        try {
            const content = btoa(JSON.stringify(manualData, null, 2)); // Base64 인코딩
            
            const params = {
                owner: repoOwner,
                repo: repoName,
                path: MANUAL_FILE_PATH,
                message: `[Manual Editor] Update ${new Date().toISOString()}`,
                content: content,
            };

            // 파일이 존재하면(sha가 있으면) sha를 포함하여 업데이트
            if (fileSha) {
                params.sha = fileSha;
            }

            const { data } = await octokit.rest.repos.createOrUpdateFileContents(params);
            
            // 업데이트 후 새로운 sha 저장
            fileSha = data.content.sha;
            console.log('Manual saved successfully!');
            return true;
        } catch (error) {
            console.error('Error saving manual file:', error);
            alert(`매뉴얼 저장 중 오류 발생: ${error.message}`);
            return false;
        } finally {
            showLoader(false);
        }
    }

    // --- UI 렌더링 함수 ---
    
    function renderItemList() {
        itemList.innerHTML = '';
        manualData.forEach(item => {
            const li = document.createElement('li');
            li.dataset.id = item.id;
            li.className = item.id === selectedItemId ? 'selected' : '';

            const span = document.createElement('span');
            span.textContent = item.title;
            li.appendChild(span);

            const controls = document.createElement('div');
            controls.className = 'item-controls';
            
            const renameBtn = document.createElement('button');
            renameBtn.textContent = '✏️';
            renameBtn.title = '이름 변경';
            renameBtn.onclick = (e) => {
                e.stopPropagation();
                handleRenameItem(item.id);
            };

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '🗑️';
            deleteBtn.title = '삭제';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                handleDeleteItem(item.id);
            };

            controls.appendChild(renameBtn);
            controls.appendChild(deleteBtn);
            li.appendChild(controls);

            li.onclick = () => handleSelectItem(item.id);

            itemList.appendChild(li);
        });
    }
    
    function renderContent() {
        const selectedItem = manualData.find(item => item.id === selectedItemId);
        const content = selectedItem ? selectedItem.content : '목차에서 항목을 선택해주세요.';
        
        if (isEditMode) {
            // 에디터 모드
            editorContainer.classList.remove('hidden');
            viewer.classList.add('hidden');
            if (editorInstance) {
                editorInstance.setMarkdown(content);
            } else {
                editorInstance = new Editor({
                    el: editorContainer,
                    initialValue: content,
                    height: '100%',
                    initialEditType: 'wysiwyg',
                    previewStyle: 'vertical'
                });
            }
            editSaveBtn.textContent = '저장';
            statusText.textContent = '편집 모드입니다.';
        } else {
            // 뷰어 모드
            editorContainer.classList.add('hidden');
            viewer.classList.remove('hidden');
            Viewer.setMarkdown(content);
            editSaveBtn.textContent = '수정';
            statusText.textContent = selectedItem ? '뷰어 모드입니다.' : '항목을 선택해주세요.';
        }
        editSaveBtn.disabled = !selectedItem;
    }

    // --- 이벤트 핸들러 ---
    
    async function handleLogin() {
        const token = tokenInput.value.trim();
        repoOwner = repoOwnerInput.value.trim();
        repoName = repoNameInput.value.trim();

        if (!token || !repoOwner || !repoName) {
            alert('모든 필드를 입력해주세요.');
            return;
        }

        // Octokit 인스턴스 생성
        octokit = new octokit.Octokit({ auth: token });
        
        // 세션 스토리지에 정보 저장 (페이지 새로고침 시 유지)
        sessionStorage.setItem('github_token', token);
        sessionStorage.setItem('repo_owner', repoOwner);
        sessionStorage.setItem('repo_name', repoName);
        
        if (await getManualFile()) {
            switchView(true);
            renderItemList();
            if (manualData.length > 0) {
                handleSelectItem(manualData[0].id);
            } else {
                renderContent();
            }
        }
    }
    
    function handleSelectItem(id) {
        if (isEditMode) {
            if (!confirm('수정 중인 내용이 있습니다. 저장하지 않고 다른 항목으로 이동하시겠습니까?')) {
                return;
            }
            isEditMode = false; // 편집 모드 해제
        }
        selectedItemId = id;
        renderItemList();
        renderContent();
    }
    
    async function handleAddItem() {
        const title = prompt('추가할 항목의 이름을 입력하세요:');
        if (title) {
            const newItem = {
                id: Date.now().toString(),
                title: title,
                content: `# ${title}\n\n새로운 내용...`
            };
            manualData.push(newItem);
            if (await saveManualFile()) {
                handleSelectItem(newItem.id);
            }
        }
    }
    
    async function handleRenameItem(id) {
        const item = manualData.find(i => i.id === id);
        const newTitle = prompt('새로운 항목 이름을 입력하세요:', item.title);
        if (newTitle && newTitle !== item.title) {
            item.title = newTitle;
            if (await saveManualFile()) {
                renderItemList();
            }
        }
    }

    async function handleDeleteItem(id) {
        const item = manualData.find(i => i.id === id);
        if (confirm(`'${item.title}' 항목을 정말 삭제하시겠습니까?`)) {
            manualData = manualData.filter(i => i.id !== id);
            if (await saveManualFile()) {
                if (selectedItemId === id) {
                    selectedItemId = null;
                    isEditMode = false; // 편집 모드 강제 해제
                    renderContent();
                }
                renderItemList();
            }
        }
    }
    
    async function handleEditSave() {
        if (!selectedItemId) return;

        if (isEditMode) {
            // 저장 로직
            const content = editorInstance.getMarkdown();
            const item = manualData.find(i => i.id === selectedItemId);
            item.content = content;
            if (await saveManualFile()) {
                isEditMode = false;
                renderContent();
            }
        } else {
            // 수정 모드 진입
            isEditMode = true;
            renderContent();
        }
    }
    
    // --- 초기화 로직 ---
    function init() {
        loginBtn.onclick = handleLogin;
        addItemBtn.onclick = handleAddItem;
        editSaveBtn.onclick = handleEditSave;

        // 세션 스토리지에서 정보 확인
        const storedToken = sessionStorage.getItem('github_token');
        const storedOwner = sessionStorage.getItem('repo_owner');
        const storedRepo = sessionStorage.getItem('repo_name');
        
        if (storedToken && storedOwner && storedRepo) {
            tokenInput.value = storedToken;
            repoOwnerInput.value = storedOwner;
            repoNameInput.value = storedRepo;
            handleLogin();
        }
    }

    init();
});
