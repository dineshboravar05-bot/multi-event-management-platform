const runTest = async () => {
    try {
        const res = await fetch('http://localhost:3000/api/checklists/Tech%20Summit%202026/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                categoryName: 'Logistics',
                title: 'Test Node Addition',
                completed: false
            })
        });
        const text = await res.text();
        console.log('Status:', res.status);
        console.log('Body:', text);
    } catch (e) {
        console.error(e);
    }
};
runTest();
