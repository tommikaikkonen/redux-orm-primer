export default function bootstrap(schema) {
    // Get the empty state according to our schema.
    const state = schema.getDefaultState();

    // Begin a mutating session with that state.
    // `state` will be mutated.
    const session = schema.withMutations(state);

    // Model classes are available as properties of the
    // Session instance.
    const { Todo, Tag, User } = session;

    // Start by creating entities whose props are not dependent
    // on others.
    const user = User.create({
        id: 0, // optional. If omitted, Redux-ORM uses a number sequence starting from 0.
        name: 'Tommi',
    });
    const otherUser = User.create({
        id: 1, // optional.
        name: 'John',
    });

    // Tags to start with.
    const work = Tag.create({ name: 'work' });
    const personal = Tag.create({ name: 'personal' });
    const urgent = Tag.create({ name: 'urgent' });
    const chore = Tag.create({ name: 'chore' });

    // Todo's for `user`
    Todo.create({
        text: 'Buy groceries',
        user,
        tags: [personal], // We could also pass ids instead of the Tag instances.
    });
    Todo.create({
        text: 'Attend meeting',
        user,
        tags: [work],
    });
    Todo.create({
        text: 'Pay bills',
        user,
        tags: [personal, urgent],
    });

    // Todo's for `otherUser`
    Todo.create({
        text: 'Prepare meals for the week',
        user: otherUser,
        tags: [personal, chore],
    });
    Todo.create({
        text: 'Fix the washing machine',
        user: otherUser,
        tags: [personal, chore],
    });
    Todo.create({
        text: 'Negotiate internet subscription',
        user: otherUser,
        tags: [personal, urgent],
    });

    // Return the whole Redux initial state.
    return {
        orm: state,
        selectedUserId: 0,
    };
}
