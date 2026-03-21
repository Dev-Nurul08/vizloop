const templates = {
  loops: {
    title: 'Filter high scores',
    JavaScript: `const scores = [4, 7, 2, 9, 6];
let total = 0;

for (let i = 0; i < scores.length; i++) {
  if (scores[i] > 5) {
    total += scores[i];
  }
}

console.log(total);`,
    Python: `scores = [4, 7, 2, 9, 6]
total = 0

for i in range(len(scores)):
    if scores[i] > 5:
        total += scores[i]

print(total)`,
  },
  arrays: {
    title: 'Find priority orders',
    JavaScript: `const orders = [12, 28, 8, 35, 22];
let revenue = 0;

for (let index = 0; index < orders.length; index++) {
  if (orders[index] > 20) {
    revenue += orders[index];
  }
}

console.log(revenue);`,
    Python: `orders = [12, 28, 8, 35, 22]
revenue = 0

for index in range(len(orders)):
    if orders[index] > 20:
        revenue += orders[index]

print(revenue)`,
  },
};

export function getLessonTemplate(topic, language) {
  const selected = templates[topic] || templates.loops;
  return { title: selected.title, code: selected[language] || selected.JavaScript };
}
