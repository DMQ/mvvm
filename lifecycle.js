window.lifecycle = function() {
    const { onBeforeCreate, onCreated, onBeforeMount, onMounted, onUpdated } = Vue;

    onBeforeMount(() => {
        console.log('beforeMount');
    });

    onMounted(() => {
        console.log('mounted');
    });

    onUpdated(() => {
        console.log('updated');
    });
}