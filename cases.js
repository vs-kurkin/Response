/*
@startuml
start

if (Action1) then
    -[#green]-> Resolve;
    :Action2;
else
    -[#red]-> Reject;
    :Action3;
endif

 @enduml
 */

Action1()
    .then(Action2)
    .fail(Action3);

Action1()
    .then(Action2, Action3);


Q(
    Action1.fail(Action3),
    Action2
);

/*
@startuml
start
    if (Action1) then
        -[#green]-> Resolve;
        if (Action2) then
            -[#green]-> Resolve;
            if (Action3) then
                -[#green]-> Resolve;
                stop
            else (Reject)
                -[#red]-> Reject;
            endif
        else (Error)
            -[#red]->
        endif

        -[#red]->
    else (Reject)
        -[#red]->
    endif

    -[#red]->
    :Action4;

    -[#red]-> Reject;
stop

@enduml
*/

Q(
    Action1,
    Action2,
    Action3
)
.fail(Action4);

/*
@startuml
start
    if (Action1) then
        -[#green]-> Resolve;
        if (Action2) then
            -[#green]-> Resolve;
            if (Action3) then
                -[#green]-> Resolve;
                stop
            else (Reject)
                -[#red]-> Reject;
                stop
            endif
        else (Error)
            -[#red]->
        endif

        -[#red]->
    else (Reject)
        -[#red]->
    endif

    -[#red]->
    :Action4;

    -[#red]-> Reject;
stop

@enduml
*/

Q(
    Q(Action1, Action2).fail(Action4),
    Action3
);

/*
@startuml
start
    if (Action1) then
        -[#green]-> Resolve;
        if (Action2) then
            -[#green]-> Resolve;
            :Action3;
            :Action4;
            -[#green]-> Resolve;
            stop
        else (Error)
            -[#red]->
        endif

        -[#red]->
    else (Reject)
        -[#red]->
    endif

    -[#red]->
    :Action5;

    -[#red]-> Reject;
stop

@enduml
*/

Q(
    Action1,
    Action2,
    Q.any(Action3, Action4)
)
    .fail(Action5);

/**
 @startuml
 start

 if (Action 1) then (Resolve)
 -[#green]->
 elseif (Action 2) then (Resolve)
 -[#green]-> Resolve;
 elseif (Action 3) then (Resolve)
 -[#green]-> Resolve;
 else
 -[#red]-> Reject;
 :Action 4;
 endif
 -[#green]-> Resolve;
 stop
 @enduml
 */

Q
    .first(
        Action1,
        Action2,
        Action3
    )
    .fail(Action4);

/**
 @startuml
 start

 if (Action 1) then
 -[#green]-> Resolve;
 :Action 4;
 elseif (Action 2) then
 -[#green]-> Resolve;
 elseif (Action 3) then
 -[#green]-> Resolve;
 :Action 5;
 else
 -[#red]-> Reject;
 :Action 6;
 endif
 -[#green]-> Resolve;
 stop
 @enduml
 */

Q
    .first(
        Q(Action1, Q.any(Action4)),
        Action2,
        Q(Action3, Q.any(Action6))
    )
    .fail(Action7);

/**
 @startuml

 start

 while (Action1)
    -[#green]-> Resolve;
    :Action2;
    :Action3;
 endwhile
 -[#red]-> Reject;
 :Action4;
 stop
 @enduml
 */


Q(
    Action1,
    Q.any(Action2, Action3),
    Q.proto.retry
)
    .fail(Action4);

/**
 @startuml

 start

 while (Action1)
    -[#green]-> Resolve;

    if (Action2) then
        -[#green]-> Resolve;
        :Action3;
    else
        -[#red]-> Reject;
        stop
    endif
 endwhile
 -[#red]-> Reject;
 :Action4;
 stop
 @enduml
 */

Q(
    Action1.fail(Action4),
    Q(Action2, Q.any(Action3)),
    Q.proto.retry
);

/**
 @startuml

 start

 while (Action1)
    -[#red]-> Reject;
    if (Action2) then
       -[#green]-> Resolve;
       :Action3;
    else
       -[#red]-> Reject;
       stop
    endif
    -[#green]-> Resolve;
 endwhile
 -[#green]-> Resolve;
 :Action4;
 stop
 @enduml
 */

var q1 = Q(Action1, Q.any(Action4));

q1.fail(
    Q(Action2, Q.any(Action3), q1)
);

/**
 @startuml

 start

 while (Action1)
    -[#red]-> Reject;
    if (Action2) then
       -[#green]-> Resolve;
            if (Action3) then (Resolve)
               -[#green]->
            else
               -[#red]-> Reject;
               stop
            endif
    else
       -[#red]-> Reject;
       stop
    endif
    -[#green]-> Resolve;
 endwhile
 -[#green]-> Resolve;
 :Action4;
 stop
 @enduml
 */

q1 = Q(Action1, Q.any(Action4));

q1.fail(
    Q(Action2, Action3, q1)
);

/**
 @startuml

 start

 while (Action1)
    -[#red]-> Reject;
    if (Action2) then
       -[#green]-> Resolve;
 stop
    else
       -[#red]-> Reject;
         if (Action3) then (Resolve)
            -[#green]->
            :Action4;
         else
            -[#red]-> Reject;
            stop
         endif
    endif
    -[#green]-> Resolve;
 endwhile
 -[#green]-> Resolve;
 stop
 @enduml
 */

Action1.fail(
    Q.first(
        Action2,
        Q(
            Action3,
            Action4
        ).always(Action1)
    )
);

/**
 @startuml

 start

 :Open file;
 -[#green]-> Resolve;
 repeat
 :Read chunk;
 -[#green]-> Resolve;
 repeat while (More data?)
 -[#green]-> Resolve;
 :Close file;
 -[#green]-> Resolve;

 stop

 @enduml
 */

OpenFile
    .then(Q(
        ReadChunk,
        function () {
            if (MoreData) {
                this.retry();
            }
        },
        CloseFile
    )
);

Q(
    OpenFile,
    ReadChunk,
    function () {
        if (MoreData) {
            this.retry(1);
            this.retry('ReadChunk');
        }
    },
    CloseFile
);

/**
 @startuml

 start

 if (Action1) then
     -[#green]-> Resolve;
     fork
        :Action2;
     fork again
        :Action3;
     end fork
    -[#green]-> Resolve;
 else
    -[#red]-> Reject;
    :Action2;
    :Action3;
    -[#green]-> Resolve;
 endif
 :Action4;

 @enduml
 */

Q(
Action1
    .then(function () {
        return new Q(
            Action2.start(), // Action2()
            Action3.start() // Action3()
        );
    })
    .fail(new Q(
        Action2,
        Action3
    ))

);

/**
 @startuml
 :Action1;
 -[#green]-> Resolve;
 fork
 :Action2;
 -[#green]-> Resolve;
 :Action3;
 -[#green]-> Resolve;
 fork again
 :Action4;
 detach
 endfork
 -[#green]-> Resolve;
 :Action5;
 -[#green]-> Resolve;
 stop
 @enduml
 */

Q(
    Action1,
    function () {
        Action4.start();

        return Q(Action2, Action3);
    },
    Action5
);

/**
 @startuml
 |Queue1|
 start
 :Action1;
 -[#green]-> Resolve;
 |#AntiqueWhite|Queue2|
 :Action2;
 -[#green]-> Resolve;
 :Action3;
 -[#green]-> Resolve;
 |Queue1|
 :Action4;
 -[#green]-> Resolve;
 |Queue2|
 :Action5;
 -[#green]-> Resolve;
 stop
 @enduml
 */

q1 = Q(
    Action1,
    Action4
);

var q2 = Q(
    Action2,
    Action3,
    Action5
);

Action1
    .onResolve(q1.stop, q1)
    .onResolve(q2.start, q2);

Action4
    .onResolve(q1.stop, q1)
    .onResolve(q2.start, q2);

Action3
    .onResolve(q2.stop, q2)
    .onResolve(q1.start, q1);
