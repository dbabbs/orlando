const credentials = {
   id: 'Wf3z49YJK9ieJhsun9Wx',
   code: '8T7Stg2Jq1qvkfBn3Za4qw',
   xyzId: 'fYhuyi7V',
   xyzToken: 'AGrdMdqrcvM-4h-0PXlBi8U'
}

const colors = {
   exists: a => `rgba(101,99,226, ${a})`,
   planned: a => `rgba(255, 122, 142, ${a})`,
   recommended: a =>  `rgba(121, 247, 202, ${a})`,
}

const pinColor = 'black';

const labels = {
   exists: 'Existing station range',
   planned: 'Planned station range',
   recommended: 'Recommended future station range'
}

const scene = 'resources/scene.yaml'

export { credentials, colors, pinColor, labels, scene }